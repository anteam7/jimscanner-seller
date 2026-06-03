// 도착 예정(ETA) 라우트 로딩 skeleton — page.tsx 의 force-dynamic 경로가 user 조회 →
// b2b_accounts 조회 → 진행중 b2b_orders 300건 fetch → 운송 defaults·셀러 overrides(Promise.all)
// → 입고 b2b_orders 300건 fetch 를 직렬로 돌리고 행마다 ETA·보관기간을 계산하는 무거운 경로라
// 첫 페인트가 지연되므로, 그 사이 page.tsx 와 동일한 레이아웃 형태를 먼저 보여준다.
// 시각 토큰은 page.tsx 와 동일 (max-w-6xl mx-auto p-4 md:p-8 컨테이너, 4 KPI 카드,
// rounded-xl border shadow-sm 테이블 카드). orders/imports/notifications/refunds loading 과 동일 Bar 패턴.

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function EtaLoading() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        도착 예정 정보를 불러오는 중입니다…
      </span>

      {/* 헤더 (제목 + 설명 + 운송일수 보정·ICS 버튼) */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Bar className="h-7 w-40" />
          <Bar className="h-4 w-64 max-w-full mt-2" />
        </div>
        <div className="flex gap-2">
          <Bar className="h-8 w-28 rounded-md" />
          <Bar className="h-8 w-28 rounded-md" />
        </div>
      </header>

      {/* 4 KPI 카드 (지연/이번 주/다음 주/이후) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['border-l-rose-500', 'border-l-indigo-500', 'border-l-sky-500', 'border-l-slate-400'].map(
          (bar, i) => (
            <div
              key={i}
              className={`rounded-lg border border-slate-200 ${bar} border-l-[3px] bg-white p-3 shadow-sm`}
            >
              <Bar className="h-3 w-12" />
              <Bar className="h-7 w-10 mt-1.5" />
              <Bar className="h-3 w-20 mt-1" />
            </div>
          ),
        )}
      </div>

      {/* 그룹 섹션 요약 줄 (지연/이번 주/다음 주) + 첫 테이블 카드 */}
      <div className="space-y-4">
        {[0, 1].map((s) => (
          <div key={s}>
            {/* summary 줄 (chevron + 제목 + 카운트 배지) */}
            <div className="flex items-center gap-2 py-2">
              <Bar className="h-3.5 w-3.5 rounded-sm" />
              <Bar className="h-4 w-32" />
              <Bar className="h-4 w-6 rounded-full" />
            </div>
            {/* 테이블 카드 (헤더행 + 4행) */}
            <div className="rounded-xl border border-slate-200 border-l-indigo-500 border-l-[3px] bg-white shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center gap-4">
                <Bar className="h-3 w-10" />
                <Bar className="h-3 w-14" />
                <Bar className="h-3 w-16 flex-1" />
                <Bar className="h-3 w-16" />
                <Bar className="h-3 w-10 ml-auto" />
              </div>
              <div className="divide-y divide-slate-100">
                {[0, 1, 2, 3].map((r) => (
                  <div key={r} className="px-3 py-2.5 flex items-center gap-4">
                    <Bar className="h-3 w-20" />
                    <Bar className="h-3 w-14" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <Bar className="h-4 w-32 max-w-full" />
                      <Bar className="h-3 w-24 max-w-full" />
                    </div>
                    <Bar className="h-3 w-16" />
                    <Bar className="h-3 w-10 ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 계산 기준 안내 카드 */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
        <Bar className="h-4 w-20" />
        <Bar className="h-3 w-full max-w-md" />
        <Bar className="h-3 w-full max-w-sm" />
        <Bar className="h-3 w-3/4 max-w-xs" />
      </div>
    </div>
  )
}
