// Supabase Edge Function — cron 매일 09:00 KST (00:00 UTC)
// 구독 갱신 D-3/D-1 사전 알림 + past_due grace period 독촉 이메일 + 만료 시 free 다운그레이드
import { createClient } from 'jsr:@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const B2B_URL = Deno.env.get('B2B_URL') ?? 'https://seller.jimscanner.co.kr'
const FROM_EMAIL = 'noreply@jimscanner.co.kr'

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ') || authHeader.slice(7) !== SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Unauthorized', { status: 401 })
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  const results: { renewal_reminders: number; grace_retries: number; downgraded: number; errors: string[] } = {
    renewal_reminders: 0, grace_retries: 0, downgraded: 0, errors: [],
  }

  try {
    // ─────────────────────────────────────────────
    // 1. 갱신 D-3 / D-1 사전 알림
    // ─────────────────────────────────────────────
    for (const days of [3, 1]) {
      const target = new Date(now)
      target.setUTCDate(target.getUTCDate() + days)
      const dayStart = new Date(target)
      dayStart.setUTCHours(0, 0, 0, 0)
      const dayEnd = new Date(target)
      dayEnd.setUTCHours(23, 59, 59, 999)

      const action = `renewal_reminder_d${days}`

      const { data: subs, error: subErr } = await db
        .from('b2b_subscriptions')
        .select(`
          id, account_id, next_billing_at, discount_override_pct,
          b2b_accounts ( email, business_name ),
          b2b_subscription_plans ( name_ko, price_monthly_krw )
        `)
        .eq('status', 'active')
        .gte('next_billing_at', dayStart.toISOString())
        .lte('next_billing_at', dayEnd.toISOString())

      if (subErr) {
        results.errors.push(`d${days} query: ${subErr.message}`)
        continue
      }

      for (const sub of subs ?? []) {
        const acct = sub.b2b_accounts as { email: string; business_name: string } | null
        const plan = sub.b2b_subscription_plans as { name_ko: string; price_monthly_krw: number } | null

        if (!acct?.email) continue

        // 중복 발송 방지
        if (await auditExists(db, sub.account_id, action, todayStr)) continue

        const discount = (sub.discount_override_pct as number | null) ?? 0
        const basePrice = plan?.price_monthly_krw ?? 0
        const finalPrice = Math.round(basePrice * (1 - discount / 100))
        const billingDateStr = new Date(sub.next_billing_at as string).toLocaleDateString('ko-KR')

        const sent = await sendEmail({
          to: acct.email,
          subject: `[짐스캐너 B2B] 구독 갱신 D-${days} 알림 — ${billingDateStr} 청구 예정`,
          html: renewalReminderHtml({
            businessName: acct.business_name,
            planName: plan?.name_ko ?? '',
            finalPrice,
            billingDateStr,
            days,
            billingUrl: `${B2B_URL}/seller/billing`,
          }),
        })

        if (!sent) {
          results.errors.push(`renewal_reminder d${days} 이메일 발송 실패: ${acct.email}`)
          continue
        }

        await db.from('b2b_audit_log').insert({
          account_id: sub.account_id,
          action,
          target_type: 'subscription',
          target_id: sub.id,
          metadata: { plan_name: plan?.name_ko, amount_krw: finalPrice, billing_date: sub.next_billing_at },
        })

        results.renewal_reminders++
      }
    }

    // ─────────────────────────────────────────────
    // 2. past_due grace period 처리
    // ─────────────────────────────────────────────
    const { data: pastDueSubs, error: pdErr } = await db
      .from('b2b_subscriptions')
      .select(`
        id, account_id, payment_retry_count, grace_period_ends_at,
        b2b_accounts ( email, business_name ),
        b2b_subscription_plans ( name_ko, price_monthly_krw )
      `)
      .eq('status', 'past_due')

    if (pdErr) {
      results.errors.push(`past_due query: ${pdErr.message}`)
    } else {
      for (const sub of pastDueSubs ?? []) {
        const acct = sub.b2b_accounts as { email: string; business_name: string } | null
        const plan = sub.b2b_subscription_plans as { name_ko: string; price_monthly_krw: number } | null
        const retryCount = (sub.payment_retry_count as number | null) ?? 0
        const graceEnd = sub.grace_period_ends_at ? new Date(sub.grace_period_ends_at as string) : null
        const graceExpired = graceEnd ? now >= graceEnd : retryCount >= 7

        if (graceExpired) {
          // ─── grace period 만료 → free 다운그레이드 ───
          const { data: freePlan } = await db
            .from('b2b_subscription_plans')
            .select('id')
            .eq('plan_code', 'free')
            .single()

          if (!freePlan) {
            results.errors.push(`free plan not found for account ${sub.account_id}`)
            continue
          }

          const { error: downgradeErr } = await db
            .from('b2b_subscriptions')
            .update({
              plan_id: freePlan.id,
              status: 'cancelled',
              cancelled_at: now.toISOString(),
              monthly_order_quota_override: 200,
              updated_at: now.toISOString(),
            })
            .eq('id', sub.id)

          if (downgradeErr) {
            results.errors.push(`downgrade ${sub.id}: ${downgradeErr.message}`)
            continue
          }

          const action = 'grace_period_expired_downgrade'
          if (!(await auditExists(db, sub.account_id, action, todayStr))) {
            if (acct?.email) {
              const sent = await sendEmail({
                to: acct.email,
                subject: '[짐스캐너 B2B] 결제 미완료로 Free 플랜으로 전환되었습니다',
                html: downgradeHtml({
                  businessName: acct.business_name,
                  billingUrl: `${B2B_URL}/seller/billing`,
                }),
              })
              if (!sent) {
                results.errors.push(`downgrade 이메일 발송 실패: ${acct.email}`)
                results.downgraded++
                continue
              }
            }

            await db.from('b2b_audit_log').insert({
              account_id: sub.account_id,
              action,
              target_type: 'subscription',
              target_id: sub.id,
              metadata: { reason: 'grace_period_expired', retry_count: retryCount },
            })
          }

          results.downgraded++
        } else {
          // ─── grace period 중 — 매일 독촉 이메일 ───
          const action = 'payment_retry_reminder'
          if (await auditExists(db, sub.account_id, action, todayStr)) continue

          const price = plan?.price_monthly_krw ?? 0
          const newRetryCount = retryCount + 1
          // 첫 실패 시 grace_period_ends_at = now + 7일
          const gracePeriodEndsAt = (sub.grace_period_ends_at as string | null)
            ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

          if (acct?.email) {
            const sent = await sendEmail({
              to: acct.email,
              subject: `[짐스캐너 B2B] 결제 실패 — 서비스 유지를 위해 결제를 재시도해 주세요 (${newRetryCount}/7일차)`,
              html: paymentRetryHtml({
                businessName: acct.business_name,
                planName: plan?.name_ko ?? '',
                price,
                retryDay: newRetryCount,
                retryUrl: `${B2B_URL}/seller/billing?action=retry`,
              }),
            })
            if (!sent) {
              results.errors.push(`payment_retry 이메일 발송 실패: ${acct.email}`)
              continue
            }
          }

          await db.from('b2b_audit_log').insert({
            account_id: sub.account_id,
            action,
            target_type: 'subscription',
            target_id: sub.id,
            metadata: { retry_count: newRetryCount, grace_period_ends_at: gracePeriodEndsAt },
          })

          await db.from('b2b_subscriptions').update({
            payment_retry_count: newRetryCount,
            grace_period_ends_at: gracePeriodEndsAt,
            updated_at: now.toISOString(),
          }).eq('id', sub.id)

          results.grace_retries++
        }
      }
    }
  } catch (err) {
    console.error('[billing-lifecycle] 예외:', err)
    results.errors.push(String(err))
  }

  return new Response(JSON.stringify(results), {
    status: results.errors.length > 0 ? 207 : 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

// ─── 중복 감사 로그 확인 ───────────────────────────────────────────────────────
async function auditExists(
  // deno-lint-ignore no-explicit-any
  db: any,
  accountId: string,
  action: string,
  todayStr: string,
): Promise<boolean> {
  const { count } = await db
    .from('b2b_audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('action', action)
    .gte('created_at', `${todayStr}T00:00:00+00:00`)
    .lt('created_at', `${todayStr}T23:59:59+00:00`)
  return (count ?? 0) > 0
}

// ─── 이메일 발송 (Resend) ─────────────────────────────────────────────────────
async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!RESEND_API_KEY) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_EMAIL, to: [opts.to], subject: opts.subject, html: opts.html }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error(`[billing-lifecycle] 이메일 발송 실패 (${res.status}):`, body)
      return false
    }
    return true
  } catch (e) {
    console.error('[billing-lifecycle] 이메일 발송 실패:', e)
    return false
  }
}

// ─── 이메일 템플릿 ────────────────────────────────────────────────────────────
function renewalReminderHtml(p: {
  businessName: string
  planName: string
  finalPrice: number
  billingDateStr: string
  days: number
  billingUrl: string
}) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
      <h2 style="color:#4f46e5">구독 갱신 D-${p.days} 안내</h2>
      <p>안녕하세요, <strong>${p.businessName}</strong>님.</p>
      <p><strong>${p.days}일 후</strong> 구독이 자동 갱신됩니다.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px;border:1px solid #e2e8f0;color:#64748b">플랜</td><td style="padding:8px;border:1px solid #e2e8f0">${p.planName}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;color:#64748b">청구 금액</td><td style="padding:8px;border:1px solid #e2e8f0"><strong>₩${p.finalPrice.toLocaleString('ko-KR')}</strong></td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;color:#64748b">청구 예정일</td><td style="padding:8px;border:1px solid #e2e8f0">${p.billingDateStr}</td></tr>
      </table>
      <p>결제 수단을 확인하시려면 아래 버튼을 클릭하세요.</p>
      <a href="${p.billingUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">결제 정보 확인</a>
      <p style="margin-top:24px;color:#94a3b8;font-size:12px">짐스캐너 B2B — 구독 관련 문의는 support@jimscanner.co.kr</p>
    </div>
  `
}

function paymentRetryHtml(p: {
  businessName: string
  planName: string
  price: number
  retryDay: number
  retryUrl: string
}) {
  const daysLeft = 7 - p.retryDay
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
      <h2 style="color:#dc2626">결제 실패 알림 (${p.retryDay}/7일차)</h2>
      <p>안녕하세요, <strong>${p.businessName}</strong>님.</p>
      <p><strong>${p.planName}</strong> 플랜 결제가 실패했습니다. 앞으로 <strong>${daysLeft}일</strong> 이내에 결제가 완료되지 않으면 Free 플랜으로 자동 전환됩니다.</p>
      <p>현재 서비스 이용은 유지되나 신규 주문 등록이 제한됩니다.</p>
      <a href="${p.retryUrl}" style="display:inline-block;background:#dc2626;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">결제 재시도하기</a>
      <p style="margin-top:24px;color:#94a3b8;font-size:12px">짐스캐너 B2B — 결제 관련 문의는 support@jimscanner.co.kr</p>
    </div>
  `
}

function downgradeHtml(p: { businessName: string; billingUrl: string }) {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1e293b">
      <h2 style="color:#dc2626">구독이 Free 플랜으로 전환되었습니다</h2>
      <p>안녕하세요, <strong>${p.businessName}</strong>님.</p>
      <p>7일간 결제가 완료되지 않아 <strong>Free 플랜</strong>으로 자동 전환되었습니다.</p>
      <p>주문 쿼터가 월 200건으로 조정되었으며, 데이터는 모두 보존됩니다.</p>
      <p>서비스를 계속 이용하시려면 구독을 다시 시작하세요.</p>
      <a href="${p.billingUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">구독 재시작</a>
      <p style="margin-top:24px;color:#94a3b8;font-size:12px">짐스캐너 B2B — 문의: support@jimscanner.co.kr</p>
    </div>
  `
}
