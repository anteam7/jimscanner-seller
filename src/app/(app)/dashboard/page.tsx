import type { Metadata } from 'next'
import { createClient } from '@/lib/auth/server'
import type { SellerAccount } from '@/components/b2b/SellerShell'
import QuotaBanner from '@/components/b2b/QuotaBanner'

export const metadata: Metadata = {
  title: '대시보드 | 짐스캐너 B2B',
  robots: { index: false },
}

type FullAccount = SellerAccount & {
  ceo_name: string | null
  business_no: string | null
}

const NEXT_ACTION: Record<number, { label: string; hint: string; href?: string }> = {
  0: {
    label: '이메일 인증 완료',
    hint: '가입 시 발송된 이메일 링크를 클릭하면 다음 단계로 진행됩니다.',
  },
  1: {
    label: '사업자 정보 입력',
    hint: '사업자등록번호와 상호 등을 입력하면 자동으로 진위 확인이 진행됩니다.',
    href: '/signup/step-4',
  },
  2: {
    label: '사업자등록증 업로드',
    hint: '서류 업로드 후 영업일 1~2일 이내에 운영팀이 검토합니다.',
    href: '/signup/step-6',
  },
}

function StatusBanner({ account }: { account: FullAccount }) {
  if (account.suspended_at) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4">
        <p className="text-sm font-semibold text-red-700">계정이 정지되었습니다</p>
        <p className="text-xs text-red-600 mt-1">
          자세한 사항은 support@jimscanner.co.kr 로 문의해 주세요.
        </p>
      </div>
    )
  }

  if (account.verification_level >= 3) {
    return (
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-5 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white border border-indigo-200 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-indigo-900">
            인증 완료 — 모든 기능을 사용할 수 있습니다
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            {account.business_name ? `${account.business_name} · ` : ''}
            {account.email}
          </p>
        </div>
      </div>
    )
  }

  const next = NEXT_ACTION[account.verification_level]
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
      <p className="text-sm font-semibold text-amber-800">계정 검증 진행 중</p>
      <p className="text-xs text-slate-700 mt-1">
        다음 단계:{' '}
        <span className="font-medium text-amber-900">{next?.label}</span>
        {next?.hint ? ` — ${next.hint}` : ''}
      </p>
      {next?.href && (
        <a
          href={next.href}
          className="inline-block mt-2.5 text-xs font-medium text-amber-800 hover:text-amber-900 underline underline-offset-2 transition-colors"
        >
          지금 완료하기 →
        </a>
      )}
    </div>
  )
}

function VerificationProgress({ level }: { level: number }) {
  const steps = [
    { label: '이메일', done: level >= 1 },
    { label: '사업자 정보', done: level >= 2 },
    { label: '서류 업로드', done: level >= 2 },
    { label: '검토 완료', done: level >= 3 },
  ]

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
        인증 진행 현황
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                ${step.done
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
            >
              {step.done ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                </svg>
              ) : (
                <span className="w-3 h-3 flex items-center justify-center">{i + 1}</span>
              )}
              {step.label}
            </div>
            {i < steps.length - 1 && (
              <span className="text-slate-300 text-xs">›</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function StatSkeleton({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-xs text-slate-500 mb-2">{label}</p>
      <div className="h-7 w-16 bg-slate-100 rounded-md animate-pulse" />
      <div className="h-3 w-24 bg-slate-100 rounded-md mt-2 animate-pulse" />
    </div>
  )
}

export default async function SellerDashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: account } = (await (supabase as any)
    .from('b2b_accounts')
    .select(
      'id, email, business_name, ceo_name, business_no, verification_level, verification_status, suspended_at'
    )
    .eq('user_id', user.id)
    .single()) as { data: FullAccount | null }

  if (!account) return null

  const displayName = account.business_name ?? account.email

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* 인사말 */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          안녕하세요{account.ceo_name ? `, ${account.ceo_name}님` : ''}
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">{displayName} 대시보드입니다.</p>
      </div>

      {/* 상태 배너 */}
      <StatusBanner account={account} />

      {/* 쿼터 경고 배너 (80% 이상 또는 초과 시에만 표시) */}
      <QuotaBanner />

      {/* 인증 진행 현황 */}
      <VerificationProgress level={account.verification_level} />

      {/* 통계 스켈레톤 (Phase D 완료 후 실제 데이터로 교체) */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          이번 달 현황
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatSkeleton label="처리된 주문" />
          <StatSkeleton label="등록 의뢰자" />
          <StatSkeleton label="주문 할당량" />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          주문 관리 기능이 활성화되면 실제 수치가 표시됩니다.
        </p>
      </div>
    </div>
  )
}
