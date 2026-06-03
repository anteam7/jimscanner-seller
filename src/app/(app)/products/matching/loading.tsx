// 상품매칭 라우트 로딩 skeleton — page.tsx 의 force-dynamic 경로
// (b2b_domestic_products 300건 + b2b_products 300건 + b2b_product_mappings Promise.all fetch)
// 가 끝날 때까지 레이아웃 형태를 먼저 보여준다.
// 시각 토큰은 page.tsx·ProductMatchingClient 와 동일 (max-w-6xl mx-auto p-4 md:p-8 컨테이너,
// lg:grid-cols-[280px_1fr] 2단 그리드 = 좌측 국내상품 목록 카드 + 우측 선택/매칭/추가 카드).

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function ProductMatchingLoading() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        상품매칭을 불러오는 중입니다…
      </span>

      {/* 헤더 */}
      <div>
        <Bar className="h-8 w-28" />
        <Bar className="h-4 w-full max-w-2xl mt-2" />
      </div>

      {/* 2단 그리드 (좌 280px 국내상품 목록 + 우 매칭 영역) */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* 좌측: 국내 상품 선택 */}
        <div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <Bar className="h-3 w-16" />
            <Bar className="h-8 w-full mt-2 rounded-md" />
          </div>
          <ul className="divide-y divide-slate-100">
            {[0, 1, 2, 3, 4, 5].map((r) => (
              <li key={r} className="px-3 py-2.5 border-l-[3px] border-l-transparent space-y-1">
                <Bar className="h-3.5 w-32" />
                <Bar className="h-2.5 w-20" />
                <Bar className="h-2.5 w-16" />
              </li>
            ))}
          </ul>
        </div>

        {/* 우측: 선택 상품 + 매칭 + 추가 */}
        <div className="space-y-4">
          {/* 선택된 국내 상품 (emerald accent) */}
          <div className="rounded-lg bg-white shadow-sm border border-slate-200 border-l-[3px] border-l-emerald-500 p-5">
            <Bar className="h-3 w-24" />
            <Bar className="h-6 w-56 max-w-full mt-1.5" />
            <Bar className="h-3 w-40 mt-1.5" />
          </div>

          {/* 매칭된 해외 상품 */}
          <div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <Bar className="h-3 w-40" />
            </div>
            <ul className="divide-y divide-slate-100">
              {[0, 1].map((r) => (
                <li key={r} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Bar className="h-4 w-48 max-w-full" />
                    <Bar className="h-3 w-56 max-w-full" />
                  </div>
                  <Bar className="h-6 w-12 rounded" />
                </li>
              ))}
            </ul>
          </div>

          {/* 매칭할 해외 상품 추가 */}
          <div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <Bar className="h-3 w-44" />
            </div>
            <ul className="divide-y divide-slate-100">
              {[0, 1, 2, 3].map((r) => (
                <li key={r} className="px-4 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <Bar className="h-3.5 w-44 max-w-full" />
                    <Bar className="h-2.5 w-52 max-w-full" />
                  </div>
                  <Bar className="h-6 w-14 rounded" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
