import type { Metadata } from 'next'
import { CUSTOMS_GUIDES } from '@/lib/b2b/customs-guide'

export const metadata: Metadata = {
  title: '통관 가이드 · 짐스캐너 SELLER',
  description: '카테고리별 한국 통관 한도·신고 의무·금지 품목 (KCS 기준).',
  robots: { index: false, follow: false },
}

export default function CustomsGuidePage() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          <span className="bg-gradient-to-r from-amber-600 to-rose-600 bg-clip-text text-transparent">통관 가이드</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          해외직구 카테고리별 한국 통관 한도·신고 의무 (KCS 한국관세청 자료 기반). 매입 전 확인 권장.
        </p>
      </header>

      <div className="rounded-lg bg-amber-50/40 border border-amber-200 px-5 py-4 text-xs text-amber-900 leading-relaxed">
        <p className="font-bold mb-1">📋 목록통관 vs 정식통관</p>
        <ul className="list-disc list-inside space-y-1">
          <li><b>목록통관</b> (간이): 개인 자가사용·$150 이하·관세 면제. 영수증·통관코드만 필요.</li>
          <li><b>정식통관</b>: $150 초과 또는 식약처 등 추가 신고 필요 품목. 관세·부가세·필요 서류 별도.</li>
          <li><b>거부</b>: 금지 품목·한도 초과·신고 의무 미이행 시 통관 거부 → 반송·폐기·자가소비.</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CUSTOMS_GUIDES.map((g) => (
          <div key={g.category} className="rounded-lg bg-white shadow-sm border border-slate-200 border-l-[3px] border-l-amber-400 p-4 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg">{g.emoji}</span>
              <h2 className="text-base font-bold text-slate-900">{g.label}</h2>
              {g.list_limit_usd != null && (
                <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  목록통관 ${g.list_limit_usd}
                </span>
              )}
              {g.agency && (
                <span className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                  {g.agency}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">{g.notes}</p>
            {g.restrictions.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-slate-600 mb-1">⚠️ 제한·주의</p>
                <ul className="text-[11px] text-slate-700 list-disc list-inside space-y-0.5">
                  {g.restrictions.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            {g.required_docs.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-slate-600 mb-1">📄 필요 서류</p>
                <p className="text-[11px] text-slate-700">{g.required_docs.join(', ')}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-[11px] text-slate-400">
        ※ 본 가이드는 KCS 기준 안내자료입니다. 실제 통관·법규 변경은 한국관세청 (www.customs.go.kr) 공식 자료 확인 권장. 짐스캐너는 정확성을 보증하지 않습니다.
      </p>
    </div>
  )
}
