// B2B 트랜잭션 이메일 헬퍼 — Resend 기반, RESEND_API_KEY 미설정 시 콘솔 경고 후 스킵

import { Resend } from 'resend'

const FROM = 'jimscanner B2B <noreply@jimscanner.co.kr>'
const BASE_URL = process.env.NEXT_PUBLIC_B2B_URL ?? 'https://seller.jimscanner.co.kr'

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.warn('[b2b/email] RESEND_API_KEY 미설정 — 이메일 발송 스킵')
    return null
  }
  return new Resend(key)
}

export async function sendReviewResultEmail(
  toEmail: string,
  result: 'approved' | 'rejected',
  businessName: string | null,
  reason?: string,
): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const name = businessName ?? toEmail

  if (result === 'approved') {
    await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: '[jimscanner B2B] 사업자등록증 심사 완료 — 서비스 이용 가능',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
          <h1 style="font-size:20px;font-weight:700;color:#1e293b;margin-bottom:8px">심사가 완료되었습니다</h1>
          <p style="color:#475569;line-height:1.6">
            안녕하세요, <strong>${escapeHtml(name)}</strong> 님.<br/>
            사업자등록증 심사가 완료되어 jimscanner B2B 서비스를 정상적으로 이용하실 수 있습니다.
          </p>
          <a href="${BASE_URL}/seller/dashboard"
             style="display:inline-block;margin-top:24px;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
            대시보드로 이동 →
          </a>
          <p style="margin-top:32px;font-size:12px;color:#94a3b8">
            문의사항은 <a href="${BASE_URL}/seller/support" style="color:#4f46e5;font-weight:600">1:1 문의 바로가기 →</a>
          </p>
        </div>
      `,
    })
  } else {
    await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: '[jimscanner B2B] 사업자등록증 심사 결과 안내',
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
          <h1 style="font-size:20px;font-weight:700;color:#1e293b;margin-bottom:8px">심사 결과 안내</h1>
          <p style="color:#475569;line-height:1.6">
            안녕하세요, <strong>${escapeHtml(name)}</strong> 님.<br/>
            제출하신 사업자등록증 심사가 아래 사유로 반려되었습니다.
          </p>
          ${reason ? `
          <div style="margin:16px 0;padding:16px;background:#fef2f2;border-left:4px solid #ef4444;border-radius:4px;color:#b91c1c;font-size:14px;line-height:1.6">
            ${escapeHtml(reason)}
          </div>
          ` : ''}
          <p style="color:#475569;line-height:1.6">
            서류를 보완하신 후 대시보드에서 다시 업로드해 주시면 재심사 진행됩니다.
          </p>
          <a href="${BASE_URL}/seller/dashboard"
             style="display:inline-block;margin-top:24px;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
            대시보드로 이동 →
          </a>
          <p style="margin-top:32px;font-size:12px;color:#94a3b8">
            이의가 있으시거나 보완 방법을 문의하시려면
            <a href="${BASE_URL}/seller/support?type=verification_inquiry" style="color:#4f46e5;font-weight:600">1:1 문의 바로가기 →</a>
          </p>
        </div>
      `,
    })
  }
}

export async function sendAccountSuspendedEmail(
  toEmail: string,
  businessName: string | null,
  reason: string,
): Promise<void> {
  const resend = getResend()
  if (!resend) return
  const name = businessName ?? toEmail
  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: '[jimscanner B2B] 계정 이용 정지 안내',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:20px;font-weight:700;color:#1e293b;margin-bottom:8px">계정 이용이 정지되었습니다</h1>
        <p style="color:#475569;line-height:1.6">
          안녕하세요, <strong>${escapeHtml(name)}</strong> 님.<br/>
          운영 정책에 따라 아래 사유로 계정 이용이 정지되었습니다.
        </p>
        <div style="margin:16px 0;padding:16px;background:#fff7ed;border-left:4px solid #f97316;border-radius:4px;color:#9a3412;font-size:14px;line-height:1.6">
          ${escapeHtml(reason)}
        </div>
        <p style="color:#475569;line-height:1.6">
          정지 해제를 요청하시거나 이의가 있으시면 고객센터로 문의해 주세요.
        </p>
        <a href="${BASE_URL}/seller/support?type=suspension_inquiry"
           style="display:inline-block;margin-top:24px;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          1:1 문의하기 →
        </a>
        <p style="margin-top:32px;font-size:12px;color:#94a3b8">
          문의사항: support@jimscanner.co.kr
        </p>
      </div>
    `,
  })
}

export async function sendAccountUnsuspendedEmail(
  toEmail: string,
  businessName: string | null,
): Promise<void> {
  const resend = getResend()
  if (!resend) return
  const name = businessName ?? toEmail
  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: '[jimscanner B2B] 계정 정지 해제 안내',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:20px;font-weight:700;color:#1e293b;margin-bottom:8px">계정 정지가 해제되었습니다</h1>
        <p style="color:#475569;line-height:1.6">
          안녕하세요, <strong>${escapeHtml(name)}</strong> 님.<br/>
          계정 정지가 해제되어 jimscanner B2B 서비스를 다시 이용하실 수 있습니다.
        </p>
        <a href="${BASE_URL}/seller/login"
           style="display:inline-block;margin-top:24px;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          로그인하기 →
        </a>
        <p style="margin-top:32px;font-size:12px;color:#94a3b8">
          문의사항: support@jimscanner.co.kr
        </p>
      </div>
    `,
  })
}

export async function sendCancellationEmail(
  toEmail: string,
  businessName: string | null,
  expiresAt?: Date | null,
): Promise<void> {
  const resend = getResend()
  if (!resend) return
  const name = businessName ?? toEmail

  const expiryLine = expiresAt
    ? `<p style="color:#475569;line-height:1.6;margin-top:8px">
        서비스 이용 가능 기간: <strong>${expiresAt.getFullYear()}년 ${expiresAt.getMonth() + 1}월 ${expiresAt.getDate()}일</strong>까지
       </p>`
    : ''

  const { error: sendErr } = await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: '[jimscanner B2B] 구독 취소 확인',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:20px;font-weight:700;color:#1e293b;margin-bottom:8px">구독이 취소되었습니다</h1>
        <p style="color:#475569;line-height:1.6">
          안녕하세요, <strong>${escapeHtml(name)}</strong> 님.<br/>
          jimscanner B2B 구독 취소가 처리되었습니다. 현재 구독 기간 종료 시까지는 서비스를 계속 이용하실 수 있습니다.
        </p>
        ${expiryLine}
        <a href="${BASE_URL}/seller/pricing"
           style="display:inline-block;margin-top:24px;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
          다시 시작하기 →
        </a>
        <p style="margin-top:32px;font-size:12px;color:#94a3b8">
          문의사항은 <a href="${BASE_URL}/seller/support" style="color:#4f46e5;font-weight:600">1:1 문의 바로가기 →</a>
        </p>
      </div>
    `,
  })
  if (sendErr) throw new Error(`Resend: ${sendErr.message}`)
}

export async function sendWithdrawalNoticeEmail(
  toEmail: string,
  businessName: string | null,
  customText?: string | null,
): Promise<boolean> {
  const resend = getResend()
  if (!resend) return false

  const name = businessName ?? '사업자'
  const DEFAULT_NOTICE =
    '구매하신 상품을 수령한 날로부터 7일 이내 청약 철회가 가능합니다 (전자상거래법 제17조).'
  const noticeText = customText?.trim() || DEFAULT_NOTICE

  const { error: sendErr } = await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: '[구매대행 안내] 청약철회 권리 고지',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:18px;font-weight:700;color:#1e293b;margin-bottom:16px">청약철회 권리 안내</h1>
        <p style="color:#475569;line-height:1.8;font-size:14px">
          ${escapeHtml(noticeText)}
        </p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0" />
        <p style="color:#94a3b8;font-size:12px;line-height:1.6">
          본 안내는 전자상거래 등에서의 소비자보호에 관한 법률 제17조에 따라 <strong>${escapeHtml(name)}</strong> 으로부터 발송된 법정 고지 메일입니다.<br/>
          청약철회 신청 또는 문의는 해당 사업자에게 직접 연락 부탁드립니다.
        </p>
      </div>
    `,
  })

  if (sendErr) {
    console.error('[b2b/email] sendWithdrawalNoticeEmail 실패:', sendErr.message)
    return false
  }
  return true
}

export async function sendAccountDeletedEmail(
  toEmail: string,
  businessName: string | null,
): Promise<void> {
  const resend = getResend()
  if (!resend) return
  const name = businessName ?? toEmail
  const { error: sendErr } = await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: '[jimscanner B2B] 계정 탈퇴 처리 완료',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px 24px">
        <h1 style="font-size:20px;font-weight:700;color:#1e293b;margin-bottom:8px">계정 탈퇴가 완료되었습니다</h1>
        <p style="color:#475569;line-height:1.6">
          안녕하세요, <strong>${escapeHtml(name)}</strong> 님.<br/>
          jimscanner B2B 계정 탈퇴 처리가 완료되었습니다. 서비스 이용에 감사드립니다.
        </p>
        <div style="margin:20px 0;padding:16px;background:#f8fafc;border-left:4px solid #94a3b8;border-radius:4px;font-size:13px;color:#475569;line-height:1.7">
          <strong>개인정보보호법 제21조 안내</strong><br/>
          귀하의 개인정보는 법령에서 정한 보존 기간 경과 후 안전하게 파기됩니다.<br/>
          탈퇴 후 동일 사업자등록번호로 재가입은 30일 후 가능합니다.
        </div>
        <p style="color:#475569;line-height:1.6">
          탈퇴와 관련된 문의사항이 있으시면 아래 이메일로 연락주세요.
        </p>
        <p style="margin-top:24px;font-size:12px;color:#94a3b8">
          문의: support@jimscanner.co.kr
        </p>
      </div>
    `,
  })
  if (sendErr) throw new Error(`Resend: ${sendErr.message}`)
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
