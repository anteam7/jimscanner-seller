// 1:1 문의 목록 라우트 로딩 skeleton — page.tsx 의 force-dynamic 경로가 user 조회 →
// account 조회 → b2b_support_tickets 50건 조회를 직렬로 돌려 첫 페인트가 지연되므로,
// 그 사이 page.tsx 와 동일한 레이아웃 형태를 먼저 보여준다.
// 시각 토큰은 page.tsx 와 동일 (max-w-4xl mx-auto p-4 md:p-8 space-y-6 컨테이너,
// 헤더[gradient 제목 + 설명 + 새 문의 작성 버튼] + 티켓 목록 카드[행마다 카테고리/상태 배지 + 제목 + 시각]).
// orders/imports/notifications/refunds/templates loading 과 동일 Bar animate-pulse 패턴.

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function SupportLoading() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        문의 내역을 불러오는 중입니다…
      </span>

      {/* 헤더 (제목 + 설명 + 새 문의 작성 버튼) */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <Bar className="h-7 w-28" />
          <Bar className="h-4 w-80 max-w-full mt-2" />
        </div>
        <Bar className="h-9 w-28 rounded flex-shrink-0" />
      </div>

      {/* 티켓 목록 카드 */}
      <div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {[0, 1, 2, 3, 4, 5].map((r) => (
            <li key={r} className="px-5 py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Bar className="h-4 w-10 rounded" />
                    <Bar className="h-4 w-14 rounded" />
                  </div>
                  <Bar className="h-4 w-56 max-w-full" />
                </div>
                <Bar className="h-3 w-20 flex-shrink-0" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
