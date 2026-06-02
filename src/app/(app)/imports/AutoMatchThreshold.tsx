'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export const DEFAULT_AUTOMATCH_THRESHOLD = 90

const OPTIONS = [
  { value: 90, label: '안전 (90+)', hint: '90점 이상만 확인 없이 매칭' },
  { value: 80, label: '보통 (80+)', hint: '80점 이상 확인 없이 매칭' },
  { value: 70, label: '적극 (70+)', hint: '70점 이상 확인 없이 매칭' },
]

/**
 * 자동 매칭 안전 임계값 — 이 점수 이상 추천은 개별 매칭 시 확인 창을 생략한다.
 * 계정 단위(b2b_accounts.automatch_threshold) 저장, 기기 간 동기화.
 */
export function AutoMatchThreshold({ value }: { value: number }) {
  const router = useRouter()
  const [val, setVal] = useState(value)
  const [saving, setSaving] = useState(false)

  async function pick(n: number) {
    if (n === val) return
    setVal(n)
    setSaving(true)
    try {
      await fetch('/api/settings/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automatch_threshold: n }),
      })
      router.refresh()
    } catch {
      /* 실패 무시 */
    } finally {
      setSaving(false)
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
          disabled={saving}
          aria-pressed={val === o.value}
          aria-busy={saving}
          title={o.hint}
          className={`px-2.5 py-1 rounded-md font-medium transition-colors disabled:opacity-60 ${
            val === o.value ? 'bg-indigo-600 text-white' : 'text-slate-600 border border-slate-200 bg-white hover:bg-slate-50'
          }`}
        >
          {o.label}
        </button>
      ))}
      <span className="text-[11px] text-slate-400">이 점수 이상은 개별 매칭 시 확인 창을 생략합니다.</span>
      <span role="status" aria-live="polite" className="sr-only">
        {saving ? '자동 매칭 임계값 저장 중…' : ''}
      </span>
    </div>
  )
}
