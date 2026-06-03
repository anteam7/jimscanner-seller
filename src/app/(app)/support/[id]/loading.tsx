// 문의 상세 라우트 로딩 skeleton — page.tsx 가 force-dynamic 으로 user 조회 →
// b2b_accounts 조회 → b2b_support_tickets(single) → b2b_support_messages(시간순) 를
// 직렬로 await 하는 동안 빈 화면 대신 레이아웃 형태를 먼저 보여준다. 시각 토큰은
// page.tsx 와 동일 (max-w-3xl mx-auto 컨테이너, rounded-lg card shadow-sm, 메시지
// 버블 admin=indigo ml-6 / seller=white mr-6, slate 계층).

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function TicketDetailLoading() {
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        문의 상세를 불러오는 중입니다…
      </span>

      {/* 목록 링크 */}
      <Bar className="h-3 w-20" />

      {/* 헤더 카드 (카테고리·상태 배지 + 제목 + 접수일) */}
      <div className="rounded-lg bg-white shadow-sm border border-slate-200 px-6 py-5">
        <div className="flex items-center gap-2 mb-2">
          <Bar className="h-4 w-10 rounded" />
          <Bar className="h-4 w-16 rounded" />
        </div>
        <Bar className="h-6 w-64" />
        <Bar className="h-3 w-32 mt-2" />
      </div>

      {/* 메시지 버블 (admin=indigo ml-6 / seller=white mr-6 교차) */}
      <div className="space-y-3">
        {[
          { admin: false },
          { admin: true },
          { admin: false },
        ].map((m, i) => (
          <div
            key={i}
            className={`rounded-lg shadow-sm border px-5 py-4 ${
              m.admin ? 'bg-indigo-50/40 border-indigo-200 ml-6' : 'bg-white border-slate-200 mr-6'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <Bar className="h-4 w-20" />
              <Bar className="h-3 w-24" />
            </div>
            <div className="space-y-1.5">
              <Bar className="h-4 w-full" />
              <Bar className={`h-4 ${i === 1 ? 'w-2/3' : 'w-5/6'}`} />
            </div>
          </div>
        ))}
      </div>

      {/* 답변 작성 폼 */}
      <div className="rounded-lg bg-white shadow-sm border border-slate-200 px-6 py-5 space-y-3">
        <Bar className="h-4 w-16" />
        <Bar className="h-24 w-full" />
        <div className="flex justify-end">
          <Bar className="h-9 w-24" />
        </div>
      </div>
    </div>
  )
}
