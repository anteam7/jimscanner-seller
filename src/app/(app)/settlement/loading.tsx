// 배대지 정산 대조 라우트 로딩 skeleton — page.tsx 의 force-dynamic 주문 최대 2000건 fetch +
// 배대지별 집계가 끝날 때까지 레이아웃 형태를 먼저 보여준다.
// 시각 토큰은 page.tsx 와 동일 (max-w-6xl mx-auto 컨테이너, KPI border-l-[3px] accent, slate 계층).

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function SettlementLoading() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        배대지 정산 대조를 불러오는 중입니다…
      </span>

      {/* 헤더 + 기간 프리셋 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Bar className="h-7 w-44" />
          <Bar className="h-4 w-80 max-w-full mt-2" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[0, 1, 2, 3].map((p) => (
            <Bar key={p} className="h-8 w-20" />
          ))}
        </div>
      </div>

      {/* KPI 카드 4개 (accent 는 page.tsx Kpi 와 동일 색) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['border-l-indigo-500', 'border-l-sky-500', 'border-l-rose-500', 'border-l-amber-500'].map((accent) => (
          <div
            key={accent}
            className={`rounded-lg border border-slate-200 ${accent} border-l-[3px] bg-white p-3 shadow-sm`}
          >
            <Bar className="h-3 w-16" />
            <Bar className="h-6 w-24 mt-2" />
            <Bar className="h-3 w-20 mt-1.5" />
          </div>
        ))}
      </div>

      {/* 배대지별 대조 테이블 카드 */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <Bar className="h-3 w-full max-w-xl" />
        </div>
        <div className="divide-y divide-slate-100">
          {[0, 1, 2, 3, 4].map((r) => (
            <div key={r} className="px-4 py-3">
              <Bar className="h-5 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* 계산 기준 안내 박스 */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
        <Bar className="h-3 w-20" />
        {[0, 1, 2].map((r) => (
          <Bar key={r} className="h-3 w-full max-w-2xl" />
        ))}
      </div>
    </div>
  )
}
