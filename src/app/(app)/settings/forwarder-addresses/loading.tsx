// 배대지 주소 설정 라우트 로딩 skeleton — page.tsx 의 force-dynamic 경로가 user 조회 →
// b2b_accounts(single) → admin client 로 b2b_forwarder_addresses(공용+본인 목록, forwarders
// 조인) + forwarders(활성 목록) 를 Promise.all 후 정렬해 직렬 await 라 첫 페인트가 지연되므로,
// 그 사이 page.tsx + ForwarderAddressManager 와 동일한 레이아웃 형태(max-w-4xl mx-auto p-4
// md:p-8 space-y-6 컨테이너, 헤더[← 설정 링크 + gradient 제목 + 설명 2줄] + 2 stat 카드
// (border-l-[3px] indigo/emerald, 내 주소·공용 주소) + 주소 목록 섹션[헤더행(제목 + 주소 추가
// 버튼) + 주소 카드(border-l-[3px], 라벨·배지 + 수신자 + 주소 줄 + 액션 버튼)] + 안내 줄)을
// 먼저 보여준다. cards/extension/billing/orders/imports/notifications/refunds/templates/support
// loading 과 동일 Bar animate-pulse + aria-busy/sr-only role=status 패턴.

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function ForwarderAddressesLoading() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        배대지 주소를 불러오는 중입니다…
      </span>

      {/* 헤더 (← 설정 + gradient 제목 + 설명 2줄) */}
      <div>
        <Bar className="h-3 w-12" />
        <Bar className="h-8 w-32 max-w-full mt-1.5" />
        <Bar className="h-4 w-full max-w-2xl mt-2" />
        <Bar className="h-4 w-2/3 max-w-md mt-1.5" />
      </div>

      {/* 2 stat 카드 (내 주소 / 공용 주소) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {['border-l-indigo-500', 'border-l-emerald-500'].map((c) => (
          <div key={c} className={`rounded-lg bg-white shadow-sm border-l-[3px] ${c} px-4 py-3`}>
            <Bar className="h-2.5 w-14" />
            <Bar className="h-6 w-12 mt-1.5" />
          </div>
        ))}
      </div>

      {/* 주소 목록 섹션 (헤더행 + 주소 카드 3개) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Bar className="h-4 w-28" />
          <Bar className="h-9 w-24 rounded" />
        </div>

        <ul className="space-y-2">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="rounded-lg bg-white shadow-sm border border-slate-200 border-l-[3px] border-l-indigo-500 px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* 라벨 + 배지 줄 */}
                  <div className="flex items-center gap-2">
                    <Bar className="h-4 w-12 rounded" />
                    <Bar className="h-4 w-24" />
                    <Bar className="h-4 w-10 rounded" />
                  </div>
                  {/* 수신자 */}
                  <Bar className="h-3 w-32" />
                  {/* 주소 줄 */}
                  <Bar className="h-3 w-full max-w-md" />
                  <Bar className="h-2.5 w-40" />
                </div>
                {/* 액션 버튼 */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Bar className="h-3 w-12" />
                  <Bar className="h-3 w-10" />
                  <Bar className="h-3 w-8" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* 안내 줄 */}
      <Bar className="h-3 w-full max-w-xl" />
    </div>
  )
}
