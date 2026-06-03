// 브라우저 확장 설정 라우트 로딩 skeleton — page.tsx 의 force-dynamic 경로가 user 조회 →
// b2b_accounts(single) → admin client 로 b2b_seller_tokens(목록, 최근 20) 를 직렬로 돌려
// 첫 페인트가 지연되므로, 그 사이 page.tsx 와 동일한 레이아웃 형태(max-w-3xl mx-auto p-4
// md:p-8 space-y-6 컨테이너, 헤더[← 설정 링크 + gradient 제목 + 1줄 설명] + 설치 가이드
// 카드[border-l-[3px] indigo, h2 + 5단계 목록] + API 토큰 카드[헤더행 + 라벨 input·발급
// 버튼 + 토큰 테이블 thead·행] + 보안 안내 줄)을 먼저 보여준다.
// cards/billing/orders/imports/notifications/refunds/templates/support loading 과 동일
// Bar animate-pulse + aria-busy/sr-only role=status 패턴.

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function ExtensionSettingsLoading() {
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        브라우저 확장 설정을 불러오는 중입니다…
      </span>

      {/* 헤더 (← 설정 + gradient 제목 + 설명 1줄) */}
      <div>
        <Bar className="h-3 w-12" />
        <Bar className="h-8 w-36 max-w-full mt-1.5" />
        <Bar className="h-4 w-full max-w-xl mt-2" />
      </div>

      {/* 설치 가이드 카드 (border-l-[3px] indigo, h2 + 5단계 목록) */}
      <div className="rounded-lg bg-white shadow-sm border border-slate-200 border-l-[3px] border-l-indigo-500 px-5 py-4">
        <Bar className="h-4 w-20" />
        <div className="mt-3 space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Bar key={i} className="h-3 w-full max-w-md" />
          ))}
        </div>
      </div>

      {/* API 토큰 카드 (헤더행 + 발급 폼 + 토큰 테이블) */}
      <div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden">
        {/* 헤더행 (제목 + 설명) */}
        <div className="px-5 py-4 border-b border-slate-100 space-y-2">
          <Bar className="h-4 w-20" />
          <Bar className="h-3 w-56 max-w-full" />
        </div>

        {/* 발급 폼 (라벨 input + 버튼) */}
        <div className="px-5 py-4 border-b border-slate-100 space-y-3">
          <Bar className="h-2.5 w-20" />
          <Bar className="h-9 w-full rounded" />
          <Bar className="h-9 w-28 rounded" />
        </div>

        {/* 토큰 테이블 (thead + 3행) */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex gap-4">
          {['w-16', 'w-14', 'w-12', 'w-20', 'w-12'].map((w) => (
            <Bar key={w} className={`h-2.5 ${w}`} />
          ))}
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="px-5 py-3 border-b border-slate-100 last:border-b-0 flex items-center gap-4">
            <Bar className="h-3.5 w-28" />
            <Bar className="h-3 w-16" />
            <Bar className="h-3 w-14" />
            <Bar className="h-3 w-14" />
            <Bar className="h-4 w-10 rounded ml-auto" />
          </div>
        ))}
      </div>

      {/* 보안 안내 줄 */}
      <Bar className="h-3 w-full max-w-xl" />
    </div>
  )
}
