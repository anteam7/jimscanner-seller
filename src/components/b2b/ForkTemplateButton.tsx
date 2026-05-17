'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ForkTemplateButton({ templateId, templateName }: { templateId: string; templateName: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function onClick() {
    if (busy) return
    if (!confirm(`'${templateName}' 양식을 내 양식으로 복사할까요? 복사 후 매핑을 자유롭게 수정할 수 있습니다.`)) return
    setBusy(true)
    try {
      const r = await fetch(`/api/form-templates/${templateId}/fork`, { method: 'POST' })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) {
        alert(j.error ?? '복사 실패')
        setBusy(false)
        return
      }
      router.push(`/templates/${j.template_id}`)
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : '복사 중 오류')
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="text-xs font-medium text-indigo-700 hover:text-indigo-800 px-2 py-1 rounded hover:bg-indigo-50 disabled:opacity-50"
      title="내 양식으로 복사하여 매핑 커스터마이즈"
    >
      {busy ? '복사 중…' : '복사 →'}
    </button>
  )
}
