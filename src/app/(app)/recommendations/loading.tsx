// 추천 상품 라우트 로딩 skeleton — page.tsx 의 force-dynamic 외부 환율 API(getExchangeRates,
// 한국수출입은행) await 가 끝날 때까지 레이아웃 형태를 먼저 보여준다.
// 시각 토큰은 page.tsx 와 동일 (max-w-6xl 컨테이너, 2 섹션 × 3열 상품 카드 그리드, card shadow-sm).

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

function CardSkeleton() {
  return (
    <article className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden">
      {/* 썸네일 + 카테고리·상품명 */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-start gap-3">
        <Bar className="w-10 h-10 rounded-md shrink-0" />
        <div className="flex-1 min-w-0">
          <Bar className="h-2.5 w-16" />
          <Bar className="h-4 w-32 max-w-full mt-1.5" />
        </div>
      </div>
      {/* 매입처·현지가·KRW 환산·예상 판매가 4행 */}
      <div className="px-4 py-3 space-y-2">
        {[0, 1, 2, 3].map((r) => (
          <div key={r} className="flex items-center justify-between">
            <Bar className="h-3 w-16" />
            <Bar className="h-3 w-20" />
          </div>
        ))}
      </div>
      {/* 예상 마진 바 */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <Bar className="h-3 w-12" />
        <Bar className="h-3 w-24" />
      </div>
    </article>
  )
}

function SectionSkeleton() {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <Bar className="h-5 w-32" />
        <Bar className="h-3 w-20" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((c) => (
          <CardSkeleton key={c} />
        ))}
      </div>
    </section>
  )
}

export default function RecommendationsLoading() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        추천 상품을 불러오는 중입니다…
      </span>

      {/* 헤더 */}
      <header>
        <Bar className="h-7 w-28" />
        <Bar className="h-4 w-96 max-w-full mt-2" />
      </header>

      {/* 일본 / 미국 트렌딩 2 섹션 */}
      <SectionSkeleton />
      <SectionSkeleton />

      {/* 하단 주석 박스 */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 space-y-1.5">
        {[0, 1, 2].map((r) => (
          <Bar key={r} className="h-2.5 w-full max-w-2xl" />
        ))}
      </div>
    </div>
  )
}
