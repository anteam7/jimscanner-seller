// SKU 편집 라우트 로딩 skeleton — page.tsx 가 force-dynamic 으로 user 조회 →
// b2b_accounts(single) → b2b_products(maybeSingle, market_links·supplier_links 조인) →
// forwarders 목록 → getSkuPriceTrend(매입 라인 통화별 단가 시계열) 를 직렬로 await 하는
// 동안 빈 화면 대신 레이아웃 형태를 먼저 보여준다. 시각 토큰은 page.tsx + ProductForm 과
// 동일 (p-8 max-w-4xl 컨테이너, 뒤로가기 + 제목 + SKU 메타 줄 헤더, rounded-xl card
// shadow-sm 섹션들[기본정보 indigo·기본값 sky border-l-[3px]·마켓/매입처/메타], slate 계층).

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function ProductEditLoading() {
  return (
    <div className="p-8 space-y-6 max-w-4xl" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        SKU 편집 화면을 불러오는 중입니다…
      </span>

      {/* 헤더 (뒤로가기 + 제목 + 즐겨찾기 + SKU 메타 줄) */}
      <div className="flex items-start gap-3">
        <Bar className="w-8 h-8 rounded-md mt-1" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Bar className="h-7 w-64" />
            <Bar className="h-5 w-5 rounded-md" />
          </div>
          <Bar className="h-3 w-40 mt-2" />
        </div>
      </div>

      <div className="space-y-6">
        {/* 기본 정보 (indigo border-l) */}
        <div className="rounded-xl border border-slate-200 border-l-[3px] border-l-indigo-500 bg-gradient-to-br from-indigo-50/30 to-white shadow-sm p-6 space-y-4">
          <Bar className="h-4 w-20" />
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-1.5">
                <Bar className="h-3 w-16" />
                <Bar className="h-9 w-full" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-1.5">
                <Bar className="h-3 w-24" />
                <Bar className="h-9 w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* 기본값 (sky border-l, 3-col 자동 채움 필드) */}
        <div className="rounded-xl border border-slate-200 border-l-[3px] border-l-sky-500 bg-white shadow-sm p-6 space-y-4">
          <div className="space-y-1.5">
            <Bar className="h-4 w-40" />
            <Bar className="h-3 w-72 max-w-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Bar className="h-3 w-16" />
                <Bar className="h-9 w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* 마켓 매핑 + 매입처 매핑 (헤더 줄 + 행) */}
        {[0, 1].map((sec) => (
          <div key={sec} className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5">
                <Bar className="h-4 w-28" />
                <Bar className="h-3 w-56 max-w-full" />
              </div>
              <Bar className="h-8 w-20 rounded-md" />
            </div>
            <div className="space-y-2">
              {[0, 1].map((r) => (
                <Bar key={r} className="h-9 w-full" />
              ))}
            </div>
          </div>
        ))}

        {/* 메타 (이미지 URL + 메모) */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <Bar className="h-4 w-12" />
          <div className="space-y-1.5">
            <Bar className="h-3 w-20" />
            <Bar className="h-9 w-full" />
          </div>
          <div className="space-y-1.5">
            <Bar className="h-3 w-12" />
            <Bar className="h-20 w-full" />
          </div>
        </div>

        {/* 저장 바 (비활성화 좌 · 취소·저장 우) */}
        <div className="flex items-center justify-between gap-2">
          <Bar className="h-8 w-20" />
          <div className="flex items-center gap-2">
            <Bar className="h-8 w-14" />
            <Bar className="h-10 w-20" />
          </div>
        </div>

        {/* 매입가 추세 카드 (SkuPriceTrend) */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <Bar className="h-4 w-28" />
          <Bar className="h-40 w-full" />
        </div>
      </div>
    </div>
  )
}
