// 주문매칭관리 라우트 로딩 skeleton — page.tsx 의 force-dynamic 경로(b2b_orders 200건 +
// b2b_supplier_purchases 200건 Promise.all fetch 후 영수증마다 findCandidates/compareAmounts
// 추천 계산)가 끝날 때까지 레이아웃 형태를 먼저 보여준다.
// 시각 토큰은 page.tsx·OrderMatchingClient 와 동일 (max-w-6xl mx-auto p-4 md:p-8 컨테이너,
// rounded-lg shadow-sm border-l-[3px] stat 카드, 매칭 카드 = bulk 바 + 탭 + 행 목록).

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function OrderMatchingLoading() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        주문매칭관리를 불러오는 중입니다…
      </span>

      {/* 헤더 */}
      <div>
        <Bar className="h-8 w-44" />
        <Bar className="h-4 w-96 max-w-full mt-2" />
      </div>

      {/* 3 stat 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          'border-l-indigo-500',
          'border-l-emerald-500',
          'border-l-amber-500',
        ].map((tone, i) => (
          <div key={i} className={`rounded-lg bg-white shadow-sm border-l-[3px] ${tone} px-5 py-4`}>
            <Bar className="h-3 w-24" />
            <Bar className="h-7 w-20 mt-2" />
            <Bar className="h-3 w-28 mt-1.5" />
          </div>
        ))}
      </div>

      {/* 매칭 카드 (bulk 바 + 탭 + 행 목록) */}
      <div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden">
        {/* 일괄 매칭 바 */}
        <div className="px-4 py-3 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-white flex items-center gap-2 flex-wrap">
          <Bar className="h-4 w-20" />
          <Bar className="h-7 w-36 rounded" />
          <Bar className="h-7 w-44 rounded" />
        </div>
        {/* 탭 행 */}
        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex gap-1">
          <Bar className="h-7 w-24 rounded" />
          <Bar className="h-7 w-28 rounded" />
        </div>
        {/* 영수증 행 목록 */}
        <div className="divide-y divide-slate-100">
          {[0, 1, 2, 3, 4, 5].map((r) => (
            <div key={r} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Bar className="h-5 w-20 rounded" />
                  <Bar className="h-4 w-28" />
                  <Bar className="h-4 w-16" />
                  <Bar className="h-4 w-20" />
                </div>
                <Bar className="h-3 w-48" />
              </div>
              <div className="flex items-center gap-1.5">
                <Bar className="h-7 w-20 rounded" />
                <Bar className="h-7 w-16 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 안내 줄 */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-3">
        <Bar className="h-3 w-72 max-w-full" />
      </div>
    </div>
  )
}
