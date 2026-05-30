'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FREE_STORAGE_DAYS_COOKIE } from '@/lib/b2b/storage-deadline'

/**
 * 무료 보관일 셀러 설정 — 쿠키에 저장하고 서버 재요청으로 즉시 반영 (DB 변경 없음).
 * 배대지마다 무료 보관 정책(7~30일)이 달라 본인 기준으로 조정.
 */
export function FreeStorageDaysControl({ value }: { value: number }) {
  const router = useRouter()
  const [days, setDays] = useState(value)
  const [saving, setSaving] = useState(false)

  function apply(n: number) {
    const safe = Math.max(1, Math.min(60, Math.floor(n) || 7))
    setDays(safe)
    setSaving(true)
    // 1년 만료 쿠키
    document.cookie = `${FREE_STORAGE_DAYS_COOKIE}=${safe}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    router.refresh()
    // refresh 후 서버 컴포넌트가 갱신되면 saving 해제 (낙관적으로 짧게)
    setTimeout(() => setSaving(false), 600)
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
        onBlur={() => { if (days !== value) apply(days) }}
        aria-label="무료 보관일 (일, 1~60)"
        className="w-14 px-1.5 py-0.5 text-xs text-right tabular-nums rounded border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <span className="text-slate-400">일</span>
      {saving && <span className="text-slate-400">…</span>}
    </label>
  )
}
