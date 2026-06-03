// 결제·구독 라우트 로딩 skeleton — page.tsx 의 force-dynamic 경로가 user 조회 →
// b2b_accounts 조회 → b2b_subscriptions(b2b_subscription_plans 조인) 조회를 직렬로 돌려
// 첫 페인트가 지연되므로, 그 사이 page.tsx 와 동일한 레이아웃 형태를 먼저 보여준다.
// 시각 토큰은 page.tsx 와 동일 (p-8 max-w-5xl space-y-6 컨테이너, 헤더[BILLING 배지 +
// gradient 제목 + 설명] + 현재 플랜 카드[indigo border-l-[3px] gradient, 플랜명/상태 +
// 사용량 진행바 + 3 stat] + 액션 카드 2개 + 안내 카드).
// orders/imports/notifications/refunds/templates/support loading 과 동일 Bar animate-pulse 패턴.

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function BillingLoading() {
  return (
    <div className="p-8 max-w-5xl space-y-6" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        구독 정보를 불러오는 중입니다…
      </span>

      {/* 헤더 (BILLING 배지 + 제목 + 설명) */}
      <div>
        <Bar className="h-6 w-20 rounded-full mb-3" />
        <Bar className="h-8 w-56 max-w-full" />
        <Bar className="h-4 w-80 max-w-full mt-2" />
      </div>

      {/* 현재 플랜 카드 */}
      <section className="rounded-2xl border border-slate-200 border-l-[3px] border-l-indigo-500 bg-gradient-to-br from-indigo-50/30 to-white shadow-sm p-6 space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1.5">
            <Bar className="h-3 w-16" />
            <Bar className="h-7 w-40" />
            <Bar className="h-3 w-52 max-w-full" />
          </div>
          <Bar className="h-7 w-24 rounded-md flex-shrink-0" />
        </div>

        {/* 사용량 진행바 */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <Bar className="h-3 w-28" />
            <Bar className="h-3 w-24" />
          </div>
          <Bar className="h-2 w-full rounded-full" />
        </div>

        {/* 가격 + 갱신일 (3 stat) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1">
              <Bar className="h-2.5 w-16" />
              <Bar className="h-4 w-20" />
            </div>
          ))}
        </div>
      </section>

      {/* 액션 카드 2개 */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 border-l-[3px] border-l-indigo-500 bg-white shadow-sm p-5"
          >
            <div className="flex items-start justify-between mb-2">
              <Bar className="w-10 h-10 rounded-lg" />
              <Bar className="w-4 h-4 rounded" />
            </div>
            <Bar className="h-4 w-20" />
            <Bar className="h-3 w-44 max-w-full mt-1.5" />
          </div>
        ))}
      </section>

      {/* 안내 카드 */}
      <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-5 space-y-2">
        <Bar className="h-3 w-16" />
        <Bar className="h-3 w-full max-w-2xl" />
        <Bar className="h-3 w-4/5 max-w-xl" />
        <Bar className="h-3 w-3/5 max-w-md" />
      </section>
    </div>
  )
}
