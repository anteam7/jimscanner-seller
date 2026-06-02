// 마진 시뮬레이터 라우트 로딩 skeleton — page.tsx 가 force-dynamic 으로 외부 환율 API
// (getExchangeRates, 한국수출입은행) 를 await 하는 동안 빈 화면 대신 레이아웃 형태를 먼저 보여준다.
// 시각 토큰은 page.tsx + MarginSimulator 와 동일 (max-w-4xl mx-auto 컨테이너,
// lg 2단 입력/결과 카드 shadow-sm, slate 계층).

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function SimulatorLoading() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        마진 시뮬레이터를 불러오는 중입니다…
      </span>

      {/* 헤더 (제목 + 안내 문구) */}
      <header>
        <Bar className="h-7 w-44" />
        <Bar className="h-4 w-full max-w-xl mt-2" />
        <Bar className="h-4 w-72 max-w-full mt-1.5" />
      </header>

      {/* 입력 / 결과 2단 (MarginSimulator grid lg:grid-cols-[1fr_1fr]) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 입력 카드 */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <Bar className="h-4 w-12" />
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="grid grid-cols-2 gap-3">
              {[0, 1].map((col) => (
                <div key={col}>
                  <Bar className="h-3 w-20" />
                  <Bar className="h-9 w-full mt-1" />
                </div>
              ))}
            </div>
          ))}
          <Bar className="h-3 w-full max-w-sm" />
        </section>

        {/* 결과 카드 */}
        <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-slate-300 bg-white p-5 shadow-sm space-y-4">
          <Bar className="h-4 w-12" />
          <div className="text-center py-2">
            <Bar className="h-3 w-28 mx-auto" />
            <Bar className="h-9 w-40 mx-auto mt-2" />
            <Bar className="h-4 w-24 mx-auto mt-1.5" />
          </div>
          <div className="space-y-2 border-t border-slate-200/70 pt-3">
            {[0, 1, 2, 3, 4].map((r) => (
              <div key={r} className="flex items-center justify-between gap-3">
                <Bar className="h-3 w-28" />
                <Bar className="h-3 w-20" />
              </div>
            ))}
          </div>
          <Bar className="h-10 w-full" />
        </section>
      </div>
    </div>
  )
}
