// 매입 영수증 상세 라우트 로딩 skeleton — page.tsx 가 force-dynamic 으로 영수증 조회 +
// 매칭 audit log + 외부 환율 API(getExchangeRates) + 매칭 주문 라인을 await 하는 동안
// 빈 화면 대신 레이아웃 형태를 먼저 보여준다. 시각 토큰은 page.tsx 와 동일
// (max-w-4xl mx-auto 컨테이너, card shadow-sm, border-l-[3px] indigo accent, slate 계층).

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function ImportDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        매입 영수증을 불러오는 중입니다…
      </span>

      {/* 헤더 (목록 링크 + 삭제 버튼) */}
      <header className="flex items-center justify-between">
        <Bar className="h-3 w-24" />
        <Bar className="h-7 w-16" />
      </header>

      {/* 상단 요약 카드 */}
      <section className="rounded-lg bg-white shadow-sm border border-slate-200 border-l-[3px] border-l-indigo-500 px-5 py-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bar className="h-5 w-16" />
              <Bar className="h-4 w-12" />
            </div>
            <Bar className="h-7 w-48" />
            <Bar className="h-3 w-56 mt-1.5" />
          </div>
          <div className="text-right">
            <Bar className="h-3 w-20 ml-auto" />
            <Bar className="h-8 w-28 mt-1 ml-auto" />
            <Bar className="h-3 w-20 mt-1 ml-auto" />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <Bar className="h-3 w-16" />
              <Bar className="h-4 w-12 mt-1" />
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100">
          <Bar className="h-3 w-52" />
        </div>
      </section>

      {/* 라인 아이템 카드 */}
      <section className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <Bar className="h-4 w-20" />
        </div>
        <ul className="divide-y divide-slate-100">
          {[0, 1, 2].map((i) => (
            <li key={i} className="px-5 py-3 flex items-start gap-3">
              <Bar className="w-12 h-12 shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <Bar className="h-4 w-3/4" />
                <Bar className="h-3 w-40" />
              </div>
              <div className="text-right shrink-0 space-y-1.5">
                <Bar className="h-4 w-16 ml-auto" />
                <Bar className="h-3 w-12 ml-auto" />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 1:N 다중 매칭 패널 자리 */}
      <section className="rounded-lg bg-white shadow-sm border border-slate-200 px-5 py-4 space-y-3">
        <Bar className="h-4 w-32" />
        <Bar className="h-9 w-full" />
        <Bar className="h-9 w-2/3" />
      </section>
    </div>
  )
}
