'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DeleteButton({ id, label }: { id: string; label: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function onClick() {
    if (
      !confirm(
        `영수증 "${label}" 을 삭제합니다.\n\n` +
        `확장에서 같은 주문번호를 다시 가져오면 새로 들어옵니다.\n계속할까요?`,
      )
    ) {
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/imports/supplier-orders/${id}`, { method: 'DELETE' })
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !json.ok) {
        alert(json.error ?? '삭제 실패')
        setBusy(false)
        return
      }
      router.push('/imports')
      router.refresh()
    } catch {
      alert('네트워크 오류')
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-800 hover:underline underline-offset-2 disabled:opacity-50"
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
      </svg>
      {busy ? '삭제 중…' : '영수증 삭제'}
    </button>
  )
}
