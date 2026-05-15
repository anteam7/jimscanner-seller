// Supabase Edge Function — cron 1h 주기
// 24h SLA 초과 미응답 티켓 탐지 → 어드민 이메일 에스컬레이션 (1회, 중복 방지)
import { createClient } from 'jsr:@supabase/supabase-js@2'

const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? 'admin@jimscanner.co.kr'
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

Deno.serve(async (req) => {
  try {
    // cron 인증 (Authorization: Bearer <service_role_key>)
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ') || authHeader.slice(7) !== SUPABASE_SERVICE_ROLE_KEY) {
      return new Response('Unauthorized', { status: 401 })
    }

    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 24h 초과 미응답 + 미에스컬레이션 티켓 조회
    const now = new Date().toISOString()
    const { data: tickets, error } = await db
      .from('b2b_support_tickets')
      .select('id, subject, account_id, created_at, sla_deadline_at, b2b_accounts(business_name)')
      .lt('sla_deadline_at', now)
      .is('first_response_at', null)
      .is('escalated_at', null)
      .in('status', ['open', 'in_progress'])

    if (error) {
      console.error('[ticket-escalation] 티켓 조회 실패:', error.message)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    if (!tickets || tickets.length === 0) {
      return new Response(JSON.stringify({ escalated: 0 }), { status: 200 })
    }

    // 에스컬레이션 이메일 발송 (Resend)
    if (RESEND_API_KEY) {
      const ticketList = tickets
        .map((t: { id: string; subject: string; created_at: string; b2b_accounts: { business_name: string | null } | null; sla_deadline_at: string }) => {
          const biz = (t.b2b_accounts as { business_name: string | null } | null)?.business_name ?? '(이름 없음)'
          return `<li>${biz} — ${t.subject} (접수: ${new Date(t.created_at).toLocaleString('ko-KR')})</li>`
        })
        .join('')

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'noreply@jimscanner.co.kr',
          to: [ADMIN_EMAIL],
          subject: `[에스컬레이션] SLA 초과 미응답 CS 티켓 ${tickets.length}건`,
          html: `
            <h2>SLA 24h 초과 미응답 티켓</h2>
            <p>아래 티켓이 24시간 이내 응답되지 않았습니다. 즉시 확인해 주세요.</p>
            <ul>${ticketList}</ul>
            <a href="https://www.jimscanner.co.kr/admin/support">CS 지원 페이지 바로가기</a>
          `,
        }),
      })
    }

    // escalated_at 업데이트
    const ids = tickets.map((t: { id: string }) => t.id)
    const { error: updateErr } = await db
      .from('b2b_support_tickets')
      .update({ escalated_at: now, escalated_to_email: ADMIN_EMAIL })
      .in('id', ids)

    if (updateErr) {
      console.error('[ticket-escalation] escalated_at 업데이트 실패:', updateErr.message)
    }

    return new Response(JSON.stringify({ escalated: tickets.length }), { status: 200 })
  } catch (err) {
    console.error('[ticket-escalation] 예외:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
