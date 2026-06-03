// 환불 상세 라우트 로딩 skeleton — page.tsx 가 force-dynamic 으로 user 조회 →
// b2b_accounts 조회 → b2b_refunds(b2b_orders·b2b_order_items 조인) maybeSingle 조회를
// 직렬로 await 하는 동안 빈 화면 대신 레이아웃 형태를 먼저 보여준다. 시각 토큰은
// page.tsx 와 동일 (max-w-4xl mx-auto 컨테이너, 2-col grid, rounded-xl card shadow-sm,
// border-l-[3px] emerald/rose/indigo accent, slate 계층).

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function RefundDetailLoading() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        환불 상세를 불러오는 중입니다…
      </span>

      {/* 헤더 (목록 링크 + 제목 + 상태 배지 + 메타 줄) */}
      <header>
        <div className="flex items-start gap-3">
          <Bar className="w-8 h-8 rounded-md mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <Bar className="h-7 w-40" />
              <Bar className="h-5 w-12" />
            </div>
            <Bar className="h-4 w-72 mt-2" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* 좌측 본문 — 3 카드 */}
        <div className="space-y-6">
          {/* 관련 주문 */}
          <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-emerald-500 bg-white shadow-sm p-6 space-y-3">
            <Bar className="h-4 w-20" />
            <div className="space-y-2.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-start gap-4">
                  <Bar className="h-3 w-16 shrink-0" />
                  <Bar className="h-4 w-40" />
                </div>
              ))}
            </div>
          </section>

          {/* 환불 사유 · 금액 */}
          <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-rose-500 bg-white shadow-sm p-6 space-y-3">
            <Bar className="h-4 w-28" />
            <div className="space-y-2.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-4">
                  <Bar className="h-3 w-16 shrink-0" />
                  <Bar className={`h-4 ${i === 1 ? 'w-3/4' : 'w-32'}`} />
                </div>
              ))}
            </div>
          </section>

          {/* 상태 이력 */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-3">
            <Bar className="h-4 w-28" />
            <ol className="space-y-2">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex items-start gap-3">
                  <Bar className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Bar className="h-4 w-24" />
                    <Bar className="h-3 w-32" />
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* 우측 사이드바 — 액션 + 날짜 */}
        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-indigo-500 bg-gradient-to-br from-indigo-50 to-white shadow-sm p-5">
            <Bar className="h-3 w-16 mb-3" />
            <Bar className="h-5 w-14 mb-4" />
            <div className="space-y-2">
              <Bar className="h-9 w-full" />
              <Bar className="h-9 w-full" />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex justify-between gap-2">
                <Bar className="h-3 w-12" />
                <Bar className="h-3 w-24" />
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  )
}
