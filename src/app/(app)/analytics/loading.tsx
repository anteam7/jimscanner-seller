// 매출·마진 분석 라우트 로딩 skeleton — page.tsx 의 force-dynamic 6개월 주문 집계 +
// 외부 환율 API + b2b_marketwide_supplier_stats RPC 가 끝날 때까지 레이아웃 형태를 먼저 보여준다.
// 시각 토큰은 page.tsx 와 동일 (max-w-6xl 컨테이너, card shadow-sm, border-l-[3px] accent, slate 계층).

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function AnalyticsLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        매출·마진 분석을 불러오는 중입니다…
      </span>

      {/* 헤더 */}
      <div>
        <Bar className="h-7 w-44" />
        <Bar className="h-4 w-80 max-w-full mt-2" />
      </div>

      {/* 요약 카드 4개 (accent 는 page.tsx SummaryCard 와 동일 색) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['border-l-indigo-500', 'border-l-emerald-500', 'border-l-sky-500', 'border-l-rose-500'].map((accent) => (
          <div
            key={accent}
            className={`rounded-xl border border-slate-200 border-l-[3px] ${accent} bg-white p-5 shadow-sm`}
          >
            <Bar className="h-3 w-14 mb-3" />
            <Bar className="h-6 w-24" />
          </div>
        ))}
      </div>

      {/* 월별 추이 + SKU TOP 20 테이블 카드 */}
      {[0, 1].map((s) => (
        <section key={s} className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <Bar className="h-4 w-28" />
          <div className="space-y-2.5">
            {[0, 1, 2, 3, 4].map((r) => (
              <Bar key={r} className="h-8 w-full" />
            ))}
          </div>
        </section>
      ))}

      {/* 매입처 비교 카드 (amber accent) */}
      <section className="rounded-xl bg-white shadow-sm border border-slate-200 border-l-[3px] border-l-amber-500 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50/60 to-white">
          <Bar className="h-5 w-64 max-w-full" />
          <Bar className="h-3 w-72 max-w-full mt-1.5" />
        </div>
        <div className="p-5 space-y-2.5">
          {[0, 1, 2].map((r) => (
            <Bar key={r} className="h-8 w-full" />
          ))}
        </div>
      </section>
    </div>
  )
}
