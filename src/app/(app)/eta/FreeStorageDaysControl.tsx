'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

/**
 * 무료 보관일 셀러 설정 — 계정 단위(b2b_accounts.free_storage_days) 저장, 기기 간 동기화.
 * 배대지마다 무료 보관 정책(7~30일)이 달라 본인 기준으로 조정.
 */
export function FreeStorageDaysControl({ value }: { value: number }) {
  const router = useRouter()
  const [days, setDays] = useState(value)
  const [saving, setSaving] = useState(false)

  async function apply(n: number) {
    const safe = Math.max(1, Math.min(60, Math.floor(n) || 7))
    setDays(safe)
    if (safe === value) return
    setSaving(true)
    try {
      await fetch('/api/settings/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ free_storage_days: safe }),
      })
      router.refresh()
    } catch {
      /* 실패해도 입력값은 유지 */
    } finally {
      setSaving(false)
    }
  }

  return (
    <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
      무료 보관일
      <input
        type="number"
        min={1}
        max={60}
        value={days}
        onChange={(e) => setDays(Number(e.target.value))}
        onBlur={() => apply(days)}
        aria-label="무료 보관일 (일, 1~60)"
        aria-busy={saving}
        className="w-14 px-1.5 py-0.5 text-xs text-right tabular-nums rounded border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <span className="text-slate-400">일</span>
      {saving && <span className="text-slate-400" aria-hidden="true">…</span>}
      <span role="status" aria-live="polite" className="sr-only">
        {saving ? '무료 보관일 저장 중…' : ''}
      </span>
    </label>
  )
}
