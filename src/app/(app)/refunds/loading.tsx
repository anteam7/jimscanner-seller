// 환불 관리 목록 라우트 로딩 skeleton — page.tsx 의 force-dynamic 경로가 account 조회 →
// b2b_refunds 50+1건(b2b_orders 조인) 페이지네이션 fetch → 상태별 카운트 fetch 를 직렬로 돌려
// 첫 페인트가 지연되므로, 그 사이 page.tsx 와 동일한 레이아웃 형태를 먼저 보여준다.
// 시각 토큰은 page.tsx 와 동일 (max-w-6xl mx-auto p-4 md:p-8 컨테이너, 필터 칩 행,
// rounded-xl border shadow-sm 테이블 카드). orders/imports/notifications loading 과 동일 Bar 패턴.

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function RefundsLoading() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        환불 내역을 불러오는 중입니다…
      </span>

      {/* 헤더 (제목 + 총 건수 설명) */}
      <header>
        <Bar className="h-7 w-28" />
        <Bar className="h-4 w-72 max-w-full mt-2" />
      </header>

      {/* 상태 필터 칩 (전체/요청/승인/처리중/정산완료/거절/취소) */}
      <div className="flex flex-wrap gap-2">
        {['w-14', 'w-12', 'w-12', 'w-16', 'w-20', 'w-12', 'w-12'].map((w, i) => (
          <Bar key={i} className={`h-7 rounded-full ${w}`} />
        ))}
      </div>

      {/* 목록 테이블 카드 */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* 헤더 행 */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center gap-4">
          <Bar className="h-3 w-14" />
          <Bar className="h-3 w-10" />
          <Bar className="h-3 w-16 flex-1" />
          <Bar className="h-3 w-12" />
          <Bar className="h-3 w-12 ml-auto" />
        </div>
        {/* 데이터 행 8개 */}
        <div className="divide-y divide-slate-100">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((r) => (
            <div key={r} className="px-4 py-3 flex items-center gap-4">
              <Bar className="h-3 w-24" />
              <Bar className="h-5 w-12 rounded-md" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <Bar className="h-4 w-32 max-w-full" />
                <Bar className="h-3 w-24 max-w-full" />
              </div>
              <Bar className="h-4 w-20" />
              <Bar className="h-4 w-16 ml-auto" />
            </div>
          ))}
        </div>
        {/* 페이지네이션 줄 */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-t border-slate-200">
          <Bar className="h-4 w-28" />
          <Bar className="h-8 w-24 rounded-md" />
        </div>
      </div>
    </div>
  )
}
