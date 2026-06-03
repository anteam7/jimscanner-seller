// 결제 카드 라우트 로딩 skeleton — page.tsx 의 force-dynamic 경로가 user 조회 →
// b2b_accounts(single) → b2b_payment_cards(목록) → b2b_order_items(이달 카드별 매입 합계,
// b2b_orders!inner 조인) 를 직렬로 돌려 첫 페인트가 지연되므로, 그 사이 page.tsx 와 동일한
// 레이아웃 형태(max-w-4xl mx-auto p-4 md:p-8 space-y-6 컨테이너, 헤더[← 설정 링크 +
// gradient 제목 + 2줄 설명] + 2 stat 카드[border-l-[3px] indigo/slate] + 카드 목록 섹션
// [헤더행(제목·추가버튼) + 카드 행] + 안내 줄)을 먼저 보여준다.
// billing/orders/imports/notifications/refunds/templates/support loading 과 동일 Bar
// animate-pulse + aria-busy/sr-only role=status 패턴.

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function PaymentCardsLoading() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        결제 카드 정보를 불러오는 중입니다…
      </span>

      {/* 헤더 (← 설정 + 제목 + 설명 2줄) */}
      <div>
        <Bar className="h-3 w-12" />
        <Bar className="h-8 w-32 max-w-full mt-1.5" />
        <Bar className="h-4 w-full max-w-xl mt-2" />
        <Bar className="h-4 w-4/5 max-w-lg mt-1" />
      </div>

      {/* 2 stat 카드 (사용 중 / 보관) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {['border-l-indigo-500', 'border-l-slate-400'].map((accent) => (
          <div key={accent} className={`rounded-lg bg-white shadow-sm border-l-[3px] ${accent} px-4 py-3`}>
            <Bar className="h-2.5 w-14" />
            <Bar className="h-6 w-12 mt-1.5" />
          </div>
        ))}
      </div>

      {/* 카드 목록 섹션 (헤더행 + 카드 행) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Bar className="h-4 w-28" />
          <Bar className="h-9 w-24 rounded" />
        </div>
        {[0, 1].map((i) => (
          <div key={i} className="rounded-lg bg-white shadow-sm border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Bar className="h-4 w-32" />
                <Bar className="h-3 w-20" />
              </div>
              <div className="flex gap-1.5">
                <Bar className="h-7 w-12 rounded" />
                <Bar className="h-7 w-12 rounded" />
              </div>
            </div>
            <Bar className="h-1.5 w-full rounded-full mt-3" />
          </div>
        ))}
      </div>

      {/* 보안 안내 줄 */}
      <Bar className="h-3 w-full max-w-2xl" />
    </div>
  )
}
