// 단골 구매자 라우트 로딩 skeleton — page.tsx 의 force-dynamic b2b_orders 최대 2,000건 fetch +
// phone×마켓 그룹화가 끝날 때까지 레이아웃 형태를 먼저 보여준다.
// 시각 토큰은 page.tsx 와 동일 (max-w-6xl mx-auto 컨테이너, 통계 border-l-[3px] accent, slate 계층).

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function ClientsLoading() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        단골 구매자를 불러오는 중입니다…
      </span>

      {/* 헤더 */}
      <div>
        <Bar className="h-7 w-32" />
        <Bar className="h-4 w-80 max-w-full mt-2" />
      </div>

      {/* 통계 카드 3개 (accent 는 page.tsx 와 동일 색) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {['border-l-indigo-500', 'border-l-emerald-500', 'border-l-amber-500'].map((accent) => (
          <div
            key={accent}
            className={`rounded-lg bg-white shadow-sm border-l-[3px] ${accent} px-5 py-4`}
          >
            <Bar className="h-3 w-16" />
            <Bar className="h-7 w-24 mt-2" />
            <Bar className="h-3 w-20 mt-1.5" />
          </div>
        ))}
      </div>

      {/* 단골 구매자 목록 카드 */}
      <div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <Bar className="h-4 w-32" />
          <Bar className="h-3 w-20" />
        </div>
        <div className="divide-y divide-slate-100">
          {[0, 1, 2, 3, 4, 5].map((r) => (
            <div key={r} className="px-4 py-3">
              <Bar className="h-5 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* 하단 주석 */}
      <Bar className="h-3 w-full max-w-2xl" />
    </div>
  )
}
