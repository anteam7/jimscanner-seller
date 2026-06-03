// 해외 주문 목록(영수증) 라우트 로딩 skeleton — page.tsx 의 force-dynamic b2b_supplier_purchases 100건 fetch +
// 최근 60일 b2b_orders 300건 + 매칭 후보 점수 계산이 끝날 때까지 레이아웃 형태를 먼저 보여준다.
// 시각 토큰은 page.tsx 와 동일 (max-w-6xl mx-auto p-4 md:p-8 컨테이너, 통계 border-l-[3px] accent, slate 계층).

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function ImportsLoading() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        해외 주문 목록을 불러오는 중입니다…
      </span>

      {/* 헤더 (제목 + 설명 + 통합 뷰 버튼) */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Bar className="h-8 w-40" />
          <Bar className="h-4 w-96 max-w-full mt-2" />
        </div>
        <Bar className="h-9 w-44 rounded-md" />
      </div>

      {/* 수동 영수증 등록 카드 영역 */}
      <div className="rounded-lg bg-white shadow-sm border border-slate-200 px-5 py-4">
        <Bar className="h-4 w-56" />
        <Bar className="h-3 w-72 max-w-full mt-2" />
      </div>

      {/* 필터 칩 행 (매입처 + 매칭 상태) */}
      <div className="flex items-center gap-2 flex-wrap">
        <Bar className="h-4 w-8" />
        {['w-12', 'w-20', 'w-20', 'w-14', 'w-12', 'w-16', 'w-12'].map((w, i) => (
          <Bar key={`s${i}`} className={`h-6 ${w} rounded-md`} />
        ))}
        <span className="text-slate-300 mx-1">|</span>
        {['w-16', 'w-16', 'w-14'].map((w, i) => (
          <Bar key={`m${i}`} className={`h-6 ${w} rounded-md`} />
        ))}
      </div>

      {/* 통계 카드 3개 (accent 는 page.tsx 와 동일 색) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {['border-l-indigo-500', 'border-l-emerald-500', 'border-l-amber-500'].map((accent) => (
          <div
            key={accent}
            className={`rounded-lg bg-white shadow-sm border-l-[3px] ${accent} px-5 py-4`}
          >
            <Bar className="h-3 w-16" />
            <Bar className="h-7 w-20 mt-2" />
            <Bar className="h-3 w-24 mt-1.5" />
          </div>
        ))}
      </div>

      {/* 영수증 목록 테이블 카드 */}
      <div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden">
        {/* 테이블 헤더 행 (6 컬럼) */}
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-4">
          <Bar className="h-3 w-12" />
          <Bar className="h-3 w-16" />
          <Bar className="h-3 w-20 flex-1" />
          <Bar className="h-3 w-12" />
          <Bar className="h-3 w-12" />
          <Bar className="h-3 w-28" />
        </div>
        {/* 영수증 행 */}
        <div className="divide-y divide-slate-100">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((r) => (
            <div key={r} className="px-4 py-3 flex items-center gap-4">
              <Bar className="h-5 w-16 rounded" />
              <Bar className="h-4 w-20" />
              <Bar className="h-4 w-48 flex-1" />
              <Bar className="h-4 w-14" />
              <Bar className="h-3 w-16" />
              <Bar className="h-7 w-28 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* 하단 주석 2줄 */}
      <Bar className="h-3 w-full max-w-3xl" />
      <Bar className="h-3 w-full max-w-2xl" />
    </div>
  )
}
