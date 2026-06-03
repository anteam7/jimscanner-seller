// 알림 목록 라우트 로딩 skeleton — page.tsx 의 force-dynamic b2b_notifications 페이지네이션 fetch +
// 안 읽은 알림 count(head:true) fetch 가 끝날 때까지 레이아웃 형태를 먼저 보여준다.
// 시각 토큰은 page.tsx 와 동일 (max-w-3xl mx-auto p-4 md:p-8 컨테이너, rounded-lg border shadow-sm
// border-l-[3px] 알림 카드, slate 계층). orders/imports/clients loading 과 동일 Bar animate-pulse 패턴.

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function NotificationsLoading() {
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        알림 목록을 불러오는 중입니다…
      </span>

      {/* 헤더 (제목 + 안 읽은 알림 수) */}
      <header>
        <Bar className="h-7 w-20" />
        <Bar className="h-4 w-36 mt-2" />
      </header>

      {/* NotificationList */}
      <div className="space-y-3">
        {/* "모두 읽음 처리" 버튼 줄 */}
        <div className="flex justify-end">
          <Bar className="h-8 w-24 rounded-md" />
        </div>

        {/* 알림 카드 목록 */}
        <ul className="space-y-2">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((r) => (
            <li key={r}>
              <div className="rounded-lg bg-white shadow-sm border border-slate-200 border-l-[3px] border-l-slate-200 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Bar className="h-4 w-8 rounded" />
                      <Bar className="h-4 w-48 max-w-full" />
                    </div>
                    <Bar className="h-3 w-64 max-w-full" />
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Bar className="h-2 w-2 rounded-full" />
                    <Bar className="h-2.5 w-16" />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* 더 보기 버튼 */}
        <div className="flex justify-center pt-2">
          <Bar className="h-9 w-32 rounded-md" />
        </div>
      </div>
    </div>
  )
}
