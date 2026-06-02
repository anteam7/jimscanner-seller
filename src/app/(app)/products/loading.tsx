// 해외 상품관리 라우트 로딩 skeleton — page.tsx 의 force-dynamic b2b_products 최대 200건 fetch
// (검색 필터 ilike 포함) 가 끝날 때까지 레이아웃 형태를 먼저 보여준다.
// 시각 토큰은 page.tsx 와 동일 (p-8 max-w-6xl 컨테이너, rounded-xl 카드, slate 계층).

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function ProductsLoading() {
  return (
    <div className="p-8 space-y-6 max-w-6xl" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        해외 상품을 불러오는 중입니다…
      </span>

      {/* 헤더 (제목 + 새 SKU 등록 버튼) */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <Bar className="h-7 w-40" />
          <Bar className="h-4 w-96 max-w-full mt-2" />
        </div>
        <Bar className="h-9 w-28 rounded-md" />
      </div>

      {/* 검색 폼 카드 */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex items-center gap-2">
        <Bar className="h-3 w-8" />
        <Bar className="h-8 flex-1 max-w-sm" />
        <Bar className="h-8 w-12" />
      </div>

      {/* 상품 목록 테이블 카드 */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-6">
          {['w-6', 'w-16', 'w-32', 'w-12', 'w-20', 'w-16', 'w-12'].map((w, i) => (
            <Bar key={i} className={`h-3 ${w}`} />
          ))}
        </div>
        <div className="divide-y divide-slate-100">
          {[0, 1, 2, 3, 4, 5].map((r) => (
            <div key={r} className="px-4 py-3">
              <Bar className="h-6 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
