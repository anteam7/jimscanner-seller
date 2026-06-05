'use client'

import { useState } from 'react'
import { CUSTOMS_GUIDES, type CustomsGuide } from '@/lib/b2b/customs-guide'

export function CustomsGuidePanel() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const guide = selected ? CUSTOMS_GUIDES.find((g) => g.category === selected) : null

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded hover:bg-amber-50 hover:border-amber-200 hover:text-amber-800 transition-colors"
        title="해외직구 카테고리별 통관 한도·신고 안내"
      >
        📋 통관 가이드
      </button>
    )
  }

  return (
    <div className="rounded-lg bg-amber-50/40 border border-amber-200 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-amber-900">📋 카테고리별 통관 가이드 (KCS 기준)</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:text-slate-700">닫기</button>
      </div>
      <div className="flex flex-wrap gap-1">
        {CUSTOMS_GUIDES.map((g) => (
          <button
            key={g.category}
            type="button"
            aria-pressed={selected === g.category}
            onClick={() => setSelected(selected === g.category ? null : g.category)}
            className={`px-2 py-0.5 text-[11px] font-medium rounded border transition-colors ${
              selected === g.category
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
            }`}
          >
            {g.emoji} {g.label}
          </button>
        ))}
      </div>
      {guide && <GuideDetail guide={guide} />}
      {!guide && (
        <p className="text-[11px] text-slate-600">카테고리를 선택하면 한도·신고 의무·금지 품목 안내가 나옵니다.</p>
      )}
    </div>
  )
}

function GuideDetail({ guide }: { guide: CustomsGuide }) {
  return (
    <div className="rounded bg-white border border-amber-200 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{guide.emoji}</span>
        <p className="text-sm font-bold text-slate-900">{guide.label}</p>
        {guide.list_limit_usd != null && (
          <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
            목록통관 ${guide.list_limit_usd}
          </span>
        )}
        {guide.agency && (
          <span className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
            {guide.agency} 신고
          </span>
        )}
      </div>
      <p className="text-[11px] text-slate-700 leading-relaxed">{guide.notes}</p>
      {guide.restrictions.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-600 mb-0.5">⚠️ 제한·주의</p>
          <ul className="text-[11px] text-slate-700 list-disc list-inside space-y-0.5">
            {guide.restrictions.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
      {guide.required_docs.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-600 mb-0.5">📄 필요 서류</p>
          <p className="text-[11px] text-slate-700">{guide.required_docs.join(', ')}</p>
        </div>
      )}
    </div>
  )
}
