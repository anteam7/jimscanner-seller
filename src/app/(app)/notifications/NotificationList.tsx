'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

const TYPE_LABEL: Record<string, string> = {
  order_status_change: '주문',
  system_announcement: '공지',
  billing: '결제',
  exchange_rate_alert: '환율',
  margin_warning: '마진',
}

const TYPE_COLOR: Record<string, string> = {
  order_status_change: 'border-l-indigo-500',
  system_announcement: 'border-l-sky-500',
  billing: 'border-l-emerald-500',
  exchange_rate_alert: 'border-l-amber-500',
  margin_warning: 'border-l-rose-500',
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

export default function NotificationList({ initialItems }: { initialItems: Notification[] }) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [loading, setLoading] = useState(false)

  async function markAll() {
    setLoading(true)
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      const now = new Date().toISOString()
      setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })))
    } finally {
      setLoading(false)
    }
  }

  async function handleClick(n: Notification) {
    if (!n.read_at) {
      fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [n.id] }),
      })
      setItems((prev) =>
        prev.map((p) => (p.id === n.id ? { ...p, read_at: new Date().toISOString() } : p)),
      )
    }
    if (n.link) router.push(n.link)
  }

  const unreadCount = items.filter((n) => !n.read_at).length

  return (
    <div className="space-y-3">
      {items.length > 0 && unreadCount > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={markAll}
            disabled={loading}
            className="h-8 px-3 text-xs font-semibold text-indigo-700 hover:text-indigo-800 hover:underline underline-offset-2 disabled:opacity-50"
          >
            모두 읽음 처리
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-lg bg-white shadow-sm border border-dashed border-slate-200 px-6 py-16 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl mb-3">
            🔔
          </div>
          <p className="text-sm font-semibold text-slate-700">알림이 없습니다.</p>
          <p className="mt-1 text-xs text-slate-500">
            주문 상태 변경·결제·환율 알림·시스템 공지가 이곳에 표시됩니다.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => handleClick(n)}
                className={`w-full text-left rounded-lg bg-white shadow-sm border border-slate-200 border-l-[3px] ${TYPE_COLOR[n.type] ?? 'border-l-slate-300'} px-4 py-3 hover:shadow-md hover:border-slate-300 transition-all ${!n.read_at ? 'bg-indigo-50/30' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 bg-slate-100 rounded">
                        {TYPE_LABEL[n.type] ?? n.type}
                      </span>
                      <p className={`text-sm truncate ${!n.read_at ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {n.title}
                      </p>
                    </div>
                    {n.body && (
                      <p className="mt-1 text-xs text-slate-600 line-clamp-2">{n.body}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {!n.read_at && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                    <p className="text-[10px] text-slate-400 tabular-nums">{formatDate(n.created_at)}</p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
