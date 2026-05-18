'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
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

const TYPE_ICON: Record<string, string> = {
  order_status_change: '📦',
  system_announcement: '📢',
  billing: '💳',
  exchange_rate_alert: '💱',
  margin_warning: '⚠️',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}일 전`
  return iso.slice(0, 10)
}

export default function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?limit=10')
      const json = (await res.json().catch(() => ({}))) as {
        notifications?: Notification[]
        unread_count?: number
      }
      setItems(json.notifications ?? [])
      setUnread(json.unread_count ?? 0)
    } catch {
      setItems([])
      setUnread(0)
    }
  }, [])

  // 첫 로드 + 60초마다 갱신
  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 60000)
    return () => clearInterval(t)
  }, [refresh])

  // 바깥 클릭 닫기
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  async function markAllRead() {
    setLoading(true)
    try {
      await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      refresh()
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
      }).then(() => refresh())
    }
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="알림"
        title="알림"
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 inline-flex items-center justify-center text-[10px] font-bold text-white bg-rose-600 rounded-full tabular-nums">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] z-40 rounded-lg border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">알림</p>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={loading}
                  className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 hover:underline underline-offset-2 disabled:opacity-50"
                >
                  모두 읽음
                </button>
              )}
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
              >
                전체 →
              </Link>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-slate-600 font-medium">아직 알림이 없습니다.</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  주문 상태 변경·결제·시스템 공지가 여기 표시됩니다.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className={`block w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${!n.read_at ? 'bg-indigo-50/40' : ''}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="text-base shrink-0 leading-none mt-0.5">
                          {TYPE_ICON[n.type] ?? '🔔'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!n.read_at ? 'font-bold text-slate-900' : 'font-medium text-slate-800'} truncate`}>
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{n.body}</p>
                          )}
                          <p className="mt-1 text-[10px] text-slate-400 tabular-nums">{timeAgo(n.created_at)}</p>
                        </div>
                        {!n.read_at && (
                          <span className="w-1.5 h-1.5 mt-2 rounded-full bg-indigo-500 shrink-0" />
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
