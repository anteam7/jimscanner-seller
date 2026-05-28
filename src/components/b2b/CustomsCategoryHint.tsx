'use client'

import { useMemo, useState } from 'react'
import {
  CUSTOMS_GUIDES,
  getCustomsGuide,
  matchCustomsCategory,
} from '@/lib/b2b/customs-guide'

/**
 * 주문 라인 입력에서 상품명 기반 통관 카테고리 자동 인식 + inline 가이드 배너.
 *
 * - value 가 비어있으면 상품명에서 자동 인식 (auto). 인식되면 "자동 인식" 배지.
 * - 사용자가 '변경'으로 다른 카테고리를 고르면 수동 값으로 고정.
 * - 자동·수동 모두 없으면 (매칭 실패) 아무것도 렌더하지 않음.
 *
 * 부모는 effectiveCategory (value || auto) 를 customs_category 로 저장한다.
 */
export function CustomsCategoryHint({
  productName,
  value,
  onChange,
}: {
  productName: string
  value: string
  onChange: (category: string) => void
}) {
  const auto = useMemo(() => matchCustomsCategory(productName), [productName])
  const effective = value || auto?.category || ''
  const guide = getCustomsGuide(effective)
  const [editing, setEditing] = useState(false)

  if (!guide) return null

  const isAuto = !value && !!auto

  return (
    <div className="rounded-md border border-amber-200 bg-gradient-to-r from-amber-50 to-white px-3 py-2 space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-base leading-none">{guide.emoji}</span>
        <span className="text-xs font-semibold text-amber-900">{guide.label}</span>
        {isAuto && (
          <span
            className="text-[10px] font-medium text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5"
            title={`상품명의 "${auto?.keyword}" 키워드로 자동 인식했습니다.`}
          >
            자동 인식
          </span>
        )}
        {guide.list_limit_usd != null && (
          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
            목록통관 ${guide.list_limit_usd}
          </span>
        )}
        {guide.agency && (
          <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
            {guide.agency} 신고
          </span>
        )}
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="ml-auto text-[10px] text-slate-500 hover:text-slate-800 underline-offset-2 hover:underline"
        >
          {editing ? '접기' : '변경'}
        </button>
      </div>

      <p className="text-[11px] text-slate-700 leading-relaxed">{guide.notes}</p>

      {guide.restrictions.length > 0 && (
        <p className="text-[11px] text-amber-800 leading-relaxed">
          ⚠️ {guide.restrictions[0]}
          {guide.restrictions.length > 1 && (
            <span className="text-amber-600"> 외 {guide.restrictions.length - 1}건</span>
          )}
        </p>
      )}

      {editing && (
        <div className="flex flex-wrap gap-1 pt-1">
          {CUSTOMS_GUIDES.map((g) => (
            <button
              key={g.category}
              type="button"
              onClick={() => {
                // 자동 인식과 같은 값을 고르면 value 비워서 다시 자동 모드로
                onChange(auto?.category === g.category ? '' : g.category)
                setEditing(false)
              }}
              className={`px-2 py-0.5 text-[11px] font-medium rounded border transition-colors ${
                effective === g.category
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
              }`}
            >
              {g.emoji} {g.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
