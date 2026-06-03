// 배대지 양식 목록 라우트 로딩 skeleton — page.tsx 의 force-dynamic 경로가 account 조회 →
// b2b_form_templates(공유+본인) 조회 → forwarders 조회를 직렬로 돌려 첫 페인트가 지연되므로,
// 그 사이 page.tsx 와 동일한 레이아웃 형태를 먼저 보여준다.
// 시각 토큰은 page.tsx 와 동일 (p-8 space-y-6 max-w-5xl 컨테이너, 헤더 + 업로드 버튼,
// 공유 템플릿 카드[indigo border-l-[3px] gradient] + 내 양식 카드[white]).
// orders/imports/notifications/refunds loading 과 동일 Bar animate-pulse 패턴.

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function TemplatesLoading() {
  return (
    <div className="p-8 space-y-6 max-w-5xl" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        배대지 양식을 불러오는 중입니다…
      </span>

      {/* 헤더 (제목 + 설명 + 업로드 버튼) */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Bar className="h-7 w-32" />
          <Bar className="h-4 w-96 max-w-full mt-2" />
        </div>
        <Bar className="h-9 w-28 rounded-md" />
      </div>

      {/* 공유 템플릿 카드 */}
      <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-indigo-500 bg-gradient-to-br from-indigo-50/30 to-white shadow-sm p-6">
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <Bar className="h-4 w-20" />
          <Bar className="h-3 w-48 max-w-full" />
        </div>
        <ul className="divide-y divide-slate-100">
          {[0, 1, 2].map((r) => (
            <li key={r} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                <Bar className="h-4 w-44 max-w-full" />
                <Bar className="h-3 w-56 max-w-full" />
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Bar className="h-5 w-14 rounded" />
                <Bar className="h-7 w-16 rounded-md" />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 내 양식 카드 */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <Bar className="h-4 w-24" />
          <Bar className="h-3 w-36 max-w-full" />
        </div>
        <ul className="divide-y divide-slate-100">
          {[0, 1, 2, 3].map((r) => (
            <li key={r} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Bar className="h-4 w-40 max-w-full" />
                <Bar className="h-3 w-64 max-w-full" />
              </div>
              <Bar className="h-6 w-20 rounded ml-auto flex-shrink-0" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
