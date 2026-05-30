'use client'

import { useEffect, useState } from 'react'

export const AUTOMATCH_THRESHOLD_KEY = 'jimscanner_b2b_automatch_threshold'
export const AUTOMATCH_THRESHOLD_EVENT = 'jimscanner-automatch-threshold'
export const DEFAULT_AUTOMATCH_THRESHOLD = 90

const OPTIONS = [
  { value: 90, label: '안전 (90+)', hint: '90점 이상만 확인 없이 매칭' },
  { value: 80, label: '보통 (80+)', hint: '80점 이상 확인 없이 매칭' },
  { value: 70, label: '적극 (70+)', hint: '70점 이상 확인 없이 매칭' },
]

/**
 * 자동 매칭 안전 임계값 — 이 점수 이상 추천은 개별 매칭 시 확인 창을 생략한다.
 * localStorage 에 저장하고 같은 페이지의 ImportMatchAction 들에 커스텀 이벤트로 전파.
 */
export function AutoMatchThreshold() {
  const [value, setValue] = useState(DEFAULT_AUTOMATCH_THRESHOLD)

  useEffect(() => {
    const v = Number(localStorage.getItem(AUTOMATCH_THRESHOLD_KEY))
    // localStorage 초기 동기화 — 1회성, cascading render 아님
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (Number.isFinite(v) && v >= 70 && v <= 95) setValue(v)
  }, [])

  function pick(n: number) {
    setValue(n)
    try {
      localStorage.setItem(AUTOMATCH_THRESHOLD_KEY, String(n))
      window.dispatchEvent(new CustomEvent(AUTOMATCH_THRESHOLD_EVENT, { detail: n }))
    } catch {
      /* localStorage 비활성 환경 무시 */
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-semibold text-slate-600">자동 매칭 임계값:</span>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => pick(o.value)}
          title={o.hint}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
            value === o.value ? 'bg-indigo-600 text-white' : 'text-slate-600 border border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          {o.label}
        </button>
      ))}
      <span className="text-[11px] text-slate-400">이 점수 이상은 개별 매칭 시 확인 창을 생략합니다.</span>
    </div>
  )
}
