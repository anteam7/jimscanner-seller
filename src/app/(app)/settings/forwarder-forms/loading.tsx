// 배송신청서 HTML 캡쳐 설정 라우트 로딩 skeleton — page.tsx 의 force-dynamic 경로가 user 조회 →
// b2b_accounts(single) → b2b_forwarder_form_snapshots(최근 50건, forwarders 조인) 를 직렬 await
// 후 배대지별 그룹핑까지 계산해 첫 페인트가 지연되므로, 그 사이 page.tsx 와 동일한 레이아웃
// 형태(max-w-6xl mx-auto p-4 md:p-8 space-y-6 컨테이너, 헤더[gradient 제목 + 설명 2줄] +
// 사용 방법 가이드 박스(indigo gradient border, 라벨 + 5단계 ol + 주석) + 2 stat 카드
// (border-l-[3px] indigo/emerald, 캡쳐 수·커버한 배대지) + 5컬럼 테이블[thead + 행] + 안내 줄)을
// 먼저 보여준다. cards/extension/forwarder-addresses/billing/orders/imports/notifications/refunds/
// templates/support loading 과 동일 Bar animate-pulse + aria-busy/sr-only role=status 패턴.

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function ForwarderFormsLoading() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        배송신청서 캡쳐 목록을 불러오는 중입니다…
      </span>

      {/* 헤더 (gradient 제목 + 설명 2줄) */}
      <div>
        <Bar className="h-8 w-48 max-w-full" />
        <Bar className="h-4 w-full max-w-2xl mt-2" />
        <Bar className="h-4 w-2/3 max-w-lg mt-1.5" />
      </div>

      {/* 사용 방법 가이드 박스 (indigo gradient border) */}
      <div className="rounded-lg bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 px-5 py-4 shadow-sm">
        <Bar className="h-2.5 w-16 mb-3" />
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Bar key={i} className="h-3.5 w-full max-w-xl" />
          ))}
        </div>
        <Bar className="h-2.5 w-72 max-w-full mt-3" />
      </div>

      {/* 2 stat 카드 (캡쳐 수 / 커버한 배대지) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {['border-l-indigo-500', 'border-l-emerald-500'].map((c) => (
          <div key={c} className={`rounded-lg bg-white shadow-sm border-l-[3px] ${c} px-5 py-4`}>
            <Bar className="h-2.5 w-16" />
            <Bar className="h-7 w-16 mt-1.5" />
          </div>
        ))}
      </div>

      {/* 테이블 카드 (thead 5열 + 행 6개) */}
      <div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center gap-4">
          <Bar className="h-2.5 w-12" />
          <Bar className="h-2.5 w-16 flex-1 max-w-[160px]" />
          <Bar className="h-2.5 w-12" />
          <Bar className="h-2.5 w-8 ml-auto" />
          <Bar className="h-2.5 w-16" />
        </div>
        <div className="divide-y divide-slate-100">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-4 py-3 flex items-center gap-4">
              {/* 배대지 배지 */}
              <Bar className="h-5 w-16 rounded" />
              {/* 페이지 (제목 + url) */}
              <div className="flex-1 min-w-0 space-y-1.5 max-w-[400px]">
                <Bar className="h-3.5 w-40" />
                <Bar className="h-2.5 w-full max-w-xs" />
              </div>
              {/* 메모 */}
              <Bar className="h-3 w-20" />
              {/* 필드 수 */}
              <Bar className="h-3.5 w-6 ml-auto" />
              {/* 캡쳐 시각 */}
              <Bar className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* 안내 줄 */}
      <Bar className="h-2.5 w-full max-w-xl" />
    </div>
  )
}
