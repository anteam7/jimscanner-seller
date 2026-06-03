// 양식 매핑 편집 라우트 로딩 skeleton — page.tsx 가 force-dynamic 으로 user 조회 →
// b2b_accounts(single) → b2b_form_templates(maybeSingle, forwarders 조인) →
// b2b_form_template_columns(정렬) → forwarders 목록 → 미리보기용 b2b_orders 1건 →
// b2b_accounts 메타 를 직렬로 await 하는 동안 빈 화면 대신 레이아웃 형태를 먼저
// 보여준다. 시각 토큰은 page.tsx + TemplateMappingEditor 와 동일 (p-8 max-w-5xl
// 컨테이너, 뒤로가기 + 제목 + 메타 줄 헤더, rounded-xl card shadow-sm 기본정보·
// 컬럼매핑 2섹션, slate 계층).

function Bar({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded-md animate-pulse ${className}`} />
}

export default function TemplateEditLoading() {
  return (
    <div className="p-8 space-y-6 max-w-5xl" aria-busy="true">
      <span className="sr-only" role="status" aria-live="polite">
        양식 매핑 편집 화면을 불러오는 중입니다…
      </span>

      {/* 헤더 (뒤로가기 + 제목 + 메타 줄) */}
      <div className="flex items-start gap-3">
        <Bar className="w-8 h-8 rounded-md mt-1" />
        <div className="flex-1 min-w-0">
          <Bar className="h-7 w-72" />
          <Bar className="h-3 w-56 mt-2" />
        </div>
      </div>

      <div className="space-y-6">
        {/* 기본 정보 섹션 (이름 input + 배대지 select 2-col) */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <Bar className="h-4 w-20" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="space-y-1.5">
                <Bar className="h-3 w-16" />
                <Bar className="h-9 w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* 컬럼 매핑 섹션 (헤더 + 6컬럼 테이블) */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-baseline justify-between gap-2 flex-wrap">
            <Bar className="h-4 w-28" />
            <Bar className="h-3 w-40" />
          </div>
          {/* 테이블 헤더행 */}
          <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex gap-3">
            <Bar className="h-3 w-12" />
            <Bar className="h-3 flex-1" />
            <Bar className="h-3 w-16" />
            <Bar className="h-3 flex-1" />
            <Bar className="h-3 w-16" />
            <Bar className="h-3 w-10" />
          </div>
          {/* 테이블 행 */}
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="px-3 py-3 flex items-start gap-3">
                <Bar className="h-4 w-10" />
                <Bar className="h-7 flex-1" />
                <Bar className="h-4 w-16" />
                <Bar className="h-7 flex-1" />
                <Bar className="h-7 w-16" />
                <Bar className="h-4 w-6" />
              </div>
            ))}
          </div>
        </div>

        {/* 저장 바 (삭제 좌 · 저장 우) */}
        <div className="flex items-center justify-between gap-2">
          <Bar className="h-8 w-24" />
          <Bar className="h-10 w-28" />
        </div>
      </div>
    </div>
  )
}
