import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '1:1 문의 · 짐스캐너 SELLER',
  description: '셀러 1:1 문의 내역과 작성.',
  robots: { index: false, follow: false },
}

const CATEGORY_LABEL: Record<string, string> = {
  general: '일반',
  billing: '결제',
  technical: '기술',
  account: '계정',
  other: '기타',
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  open: { label: '답변 대기', cls: 'text-amber-800 bg-amber-50 border-amber-200' },
  answered: { label: '답변 도착', cls: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
  closed: { label: '종료', cls: 'text-slate-600 bg-slate-100 border-slate-200' },
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yy}.${mm}.${dd} ${hh}:${mi}`
}

export default async function SupportPage() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return <div className="p-8 text-sm text-slate-600">로그인이 필요합니다.</div>
  }

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) {
    return <div className="p-8 text-sm text-slate-600">사업자 계정이 없습니다.</div>
  }

  const { data: rows } = await sb
    .from('b2b_support_tickets')
    .select('id, subject, category, status, last_message_at, created_at')
    .eq('account_id', account.id)
    .order('last_message_at', { ascending: false })
    .limit(50)

  const tickets = rows ?? []

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">1:1 문의</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">계정·결제·기술 등 어떤 주제든 문의해 주세요. 영업일 기준 1~2일 내 답변.</p>
        </div>
        <Link
          href="/support/new"
          className="inline-flex h-9 px-4 items-center text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
        >
          새 문의 작성
        </Link>
      </header>

      <div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden">
        {tickets.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl mb-3">
              💬
            </div>
            <p className="text-sm font-semibold text-slate-700">아직 문의가 없습니다.</p>
            <p className="mt-1 text-xs text-slate-500">궁금한 점이나 불편 사항을 자유롭게 남겨 주세요.</p>
            <Link
              href="/support/new"
              className="mt-4 inline-flex h-9 px-4 items-center text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
            >
              첫 문의 작성하기
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {tickets.map((t) => {
              const sty = STATUS_STYLE[t.status] ?? STATUS_STYLE.open
              return (
                <li key={t.id}>
                  <Link
                    href={`/support/${t.id}`}
                    className="block px-5 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 bg-slate-100 rounded">
                            {CATEGORY_LABEL[t.category] ?? t.category}
                          </span>
                          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded border ${sty.cls}`}>
                            {sty.label}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 truncate">{t.subject}</p>
                      </div>
                      <div className="flex flex-col items-end shrink-0">
                        <p className="text-[10px] text-slate-400 tabular-nums">{formatDate(t.last_message_at)}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
