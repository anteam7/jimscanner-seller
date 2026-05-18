import type { Metadata } from 'next'
import Link from 'next/link'
import NewTicketForm from './NewTicketForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '새 문의 작성 · 짐스캐너 SELLER',
  robots: { index: false, follow: false },
}

export default function NewSupportPage() {
  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <header>
        <Link href="/support" className="text-xs text-slate-500 hover:text-slate-700">← 문의 목록</Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">새 문의 작성</h1>
        <p className="mt-1 text-sm text-slate-600">정확한 답변을 위해 상황을 구체적으로 적어 주세요.</p>
      </header>
      <NewTicketForm />
    </div>
  )
}
