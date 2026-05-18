import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import ReplyForm from './ReplyForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '문의 상세 · 짐스캐너 SELLER',
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

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return <div className="p-8 text-sm text-slate-600">로그인이 필요합니다.</div>
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) {
    return <div className="p-8 text-sm text-slate-600">사업자 계정이 없습니다.</div>
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ticket } = await (admin as any)
    .from('b2b_support_tickets')
    .select('id, subject, category, status, created_at, last_message_at')
    .eq('id', id)
    .eq('account_id', account.id)
    .single()
  if (!ticket) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: messages } = await (admin as any)
    .from('b2b_support_messages')
    .select('id, sender, body, created_at')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  const msgs = (messages ?? []) as { id: string; sender: 'seller' | 'admin'; body: string; created_at: string }[]
  const sty = STATUS_STYLE[ticket.status] ?? STATUS_STYLE.open
  const canReply = ticket.status !== 'closed'

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <Link href="/support" className="text-xs text-slate-500 hover:text-slate-700">← 문의 목록</Link>

      <div className="rounded-lg bg-white shadow-sm border border-slate-200 px-6 py-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 bg-slate-100 rounded">
            {CATEGORY_LABEL[ticket.category] ?? ticket.category}
          </span>
          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded border ${sty.cls}`}>
            {sty.label}
          </span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{ticket.subject}</h1>
        <p className="mt-1 text-[11px] text-slate-400 tabular-nums">접수 {formatDate(ticket.created_at)}</p>
      </div>

      <div className="space-y-3">
        {msgs.map((m) => {
          const isAdmin = m.sender === 'admin'
          return (
            <div
              key={m.id}
              className={`rounded-lg shadow-sm border px-5 py-4 ${isAdmin ? 'bg-indigo-50/40 border-indigo-200 ml-6' : 'bg-white border-slate-200 mr-6'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${isAdmin ? 'text-indigo-700' : 'text-slate-700'}`}>
                  {isAdmin ? '짐스캐너 운영팀' : '나'}
                </span>
                <span className="text-[10px] text-slate-400 tabular-nums">{formatDate(m.created_at)}</span>
              </div>
              <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{m.body}</p>
            </div>
          )
        })}
      </div>

      {canReply ? (
        <ReplyForm ticketId={ticket.id} />
      ) : (
        <p className="text-xs text-slate-500 text-center py-4 bg-slate-50 rounded">이 문의는 종료되었습니다.</p>
      )}
    </div>
  )
}
