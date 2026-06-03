// 운송일수 보정 설정 라우트 로딩 skeleton — page.tsx 의 force-dynamic 경로가 user 조회 →
// b2b_accounts(single) → b2b_forwarder_transit_defaults(활성 시드) + b2b_seller_transit_overrides
// (본인 보정) 를 Promise.all 후 직렬 await 라 첫 페인트가 지연되므로, 그 사이 page.tsx +
// TransitOverrideEditor 와 동일한 레이아웃 형태(max-w-4xl mx-auto p-4 md:p-8 space-y-6 컨테이너,
// 헤더[← 설정 링크 + sky→indigo gradient 제목 + 설명 3줄] + 에디터[보정 건수 줄 + 5컬럼 테이블
// 카드(border-l-[3px] sky, thead 국가/운송수단/기본(시드)/내 보정(일)/액션 + 6행)] + 동작 방식
// 안내 카드(slate-50, 제목 + 3 list))을 먼저 보여준다. forwarder-forms/forwarder-addresses/
// extension/cards/billing/orders/imports/notifications/refunds/templates/support loading 과 동일
// Bar animate-pulse + aria-busy/sr-only role=status 패턴.

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function TransitSettingsLoading() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        운송일수 보정값을 불러오는 중입니다…
      </span>

      {/* 헤더 (← 설정 + gradient 제목 + 설명 3줄) */}
      <div>
        <Bar className="h-3 w-12" />
        <Bar className="h-8 w-40 max-w-full mt-2" />
        <Bar className="h-4 w-full max-w-2xl mt-1.5" />
        <Bar className="h-4 w-full max-w-xl mt-1.5" />
        <Bar className="h-4 w-1/2 max-w-xs mt-1.5" />
      </div>

      {/* TransitOverrideEditor (보정 건수 줄 + 테이블 카드) */}
      <div className="space-y-3">
        {/* 보정 적용 중 N건 줄 */}
        <div className="flex items-center justify-between">
          <Bar className="h-3 w-24" />
        </div>

        {/* 5컬럼 테이블 카드 */}
        <div className="rounded-xl border border-slate-200 border-l-[3px] border-l-sky-500 bg-white shadow-sm overflow-hidden">
          {/* thead */}
          <div className="bg-slate-50 border-b border-slate-200 grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 px-3 py-2">
            <Bar className="h-2.5 w-8" />
            <Bar className="h-2.5 w-12" />
            <Bar className="h-2.5 w-16" />
            <Bar className="h-2.5 w-16" />
            <Bar className="h-2.5 w-10" />
          </div>
          {/* tbody 6행 */}
          <div className="divide-y divide-slate-100">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center px-3 py-2.5">
                {/* 국가 */}
                <Bar className="h-4 w-16" />
                {/* 운송수단 */}
                <Bar className="h-3 w-10" />
                {/* 기본 (시드) */}
                <Bar className="h-3 w-14" />
                {/* 내 보정 input */}
                <Bar className="h-7 w-20 rounded-md" />
                {/* 저장 버튼 */}
                <Bar className="h-7 w-12 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 동작 방식 안내 카드 */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
        <Bar className="h-3 w-16" />
        <Bar className="h-3 w-full max-w-md" />
        <Bar className="h-3 w-full max-w-sm" />
        <Bar className="h-3 w-1/2 max-w-xs" />
      </div>
    </div>
  )
}
