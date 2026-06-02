// 주문 상세 라우트 로딩 skeleton — page.tsx 의 force-dynamic 주문/라인 조회 +
// 외부 환율 API(getExchangeRates) + 통관 가이드 + 결제카드 조회가 끝날 때까지
// 레이아웃 형태를 먼저 보여준다. 네비게이션 동안 빈 화면 방지.
// 시각 토큰은 page.tsx 와 동일 (p-8 max-w-5xl, [1fr_280px] 그리드, border-l-[3px] accent, slate 계층).

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function OrderDetailLoading() {
  return (
    <div className="p-8 space-y-6 max-w-5xl" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        주문 상세를 불러오는 중입니다…
      </span>

      {/* 헤더 (목록 화살표 + 제목 + 배지) */}
      <div className="flex items-start gap-3">
        <Bar className="w-8 h-8 mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <Bar className="h-8 w-44" />
            <Bar className="h-5 w-16 rounded-full" />
            <Bar className="h-5 w-14" />
          </div>
          <Bar className="h-4 w-72 max-w-full mt-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* 좌측 */}
        <div className="space-y-6">
          {/* 마켓 + 구매자 (emerald accent) */}
          <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-emerald-500 bg-gradient-to-br from-emerald-50/30 to-white shadow-sm p-6 space-y-4">
            <Bar className="h-4 w-40" />
            <div className="space-y-2.5">
              {[0, 1, 2, 3, 4].map((r) => (
                <div key={r} className="flex justify-between gap-4">
                  <Bar className="h-3.5 w-24" />
                  <Bar className="h-3.5 w-48 max-w-[60%]" />
                </div>
              ))}
            </div>
          </section>

          {/* 라인 아이템 (sky accent) */}
          <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-sky-500 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <Bar className="h-4 w-32" />
            </div>
            <div className="divide-y divide-slate-100">
              {[0, 1].map((r) => (
                <div key={r} className="p-6 flex gap-4">
                  <Bar className="h-16 w-16 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Bar className="h-4 w-3/4" />
                    <Bar className="h-3 w-1/2" />
                    <Bar className="h-3 w-2/3" />
                  </div>
                  <Bar className="h-5 w-20" />
                </div>
              ))}
            </div>
          </section>

          {/* 메모 */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
            <Bar className="h-4 w-16" />
            <Bar className="h-3.5 w-full max-w-md" />
          </section>
        </div>

        {/* 우측 사이드바 */}
        <aside className="space-y-4">
          {/* 현재 상태 (indigo accent) */}
          <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-indigo-500 bg-gradient-to-br from-indigo-50 to-white shadow-sm p-5 space-y-3">
            <Bar className="h-3 w-20" />
            <Bar className="h-6 w-24 rounded-full" />
            <Bar className="h-9 w-full" />
          </section>

          {/* 보조 카드 2개 */}
          {[0, 1].map((c) => (
            <section key={c} className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
              <Bar className="h-3 w-24" />
              <Bar className="h-4 w-full" />
              <Bar className="h-4 w-2/3" />
            </section>
          ))}
        </aside>
      </div>
    </div>
  )
}
