// 국내 주문 목록 라우트 로딩 skeleton — page.tsx 의 force-dynamic b2b_orders 페이지네이션 fetch +
// 영수증 매칭 count + 합배송 templates fetch 가 끝날 때까지 레이아웃 형태를 먼저 보여준다.
// 시각 토큰은 page.tsx 와 동일 (p-8 max-w-6xl 컨테이너, rounded-xl border shadow-sm 카드, slate 계층).

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function OrdersLoading() {
  return (
    <div className="p-8 space-y-6 max-w-6xl" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        국내 주문 목록을 불러오는 중입니다…
      </span>

      {/* 헤더 */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <Bar className="h-8 w-44" />
          <Bar className="h-4 w-72 max-w-full mt-2" />
        </div>
        <div className="flex items-center gap-2">
          <Bar className="h-9 w-28 rounded-md" />
          <Bar className="h-9 w-24 rounded-md" />
          <Bar className="h-9 w-28 rounded-md" />
        </div>
      </div>

      {/* 필터 + 검색 카드 */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
        {/* 상태 필터 칩 */}
        <div className="flex items-center gap-1 flex-wrap">
          {['w-12', 'w-16', 'w-16', 'w-16', 'w-20', 'w-14', 'w-16', 'w-12', 'w-16', 'w-16', 'w-16'].map((w, i) => (
            <Bar key={i} className={`h-6 ${w} rounded-md`} />
          ))}
        </div>
        {/* 마켓 필터 + 검색 */}
        <div className="flex items-center gap-2 flex-wrap">
          <Bar className="h-3 w-8" />
          <Bar className="h-7 w-28 rounded-md" />
          <div className="ml-auto flex items-center gap-2">
            <Bar className="h-8 w-48 rounded-md" />
            <Bar className="h-8 w-12 rounded-md" />
          </div>
        </div>
      </div>

      {/* 주문 목록 카드 */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* 테이블 헤더 행 */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-4">
          <Bar className="h-3 w-24" />
          <Bar className="h-3 w-20" />
          <Bar className="h-3 w-16" />
          <Bar className="h-3 w-20 ml-auto" />
        </div>
        {/* 주문 행 */}
        <div className="divide-y divide-slate-100">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((r) => (
            <div key={r} className="px-4 py-3.5 flex items-center gap-4">
              <Bar className="h-5 w-28" />
              <Bar className="h-5 w-24 rounded-full" />
              <Bar className="h-4 w-40 hidden sm:block" />
              <Bar className="h-5 w-16 ml-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* 페이지네이션 정보 줄 */}
      <div className="flex items-center justify-between pt-1">
        <Bar className="h-3 w-48" />
        <div className="flex items-center gap-1">
          <Bar className="h-6 w-14 rounded-md" />
          <Bar className="h-6 w-14 rounded-md" />
        </div>
      </div>
    </div>
  )
}
