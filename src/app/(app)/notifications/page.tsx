import type { Metadata } from 'next'
import { createClient } from '@/lib/auth/server'
import NotificationList from './NotificationList'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '알림 · 짐스캐너 SELLER',
  description: '주문 상태 변경, 결제, 시스템 공지 등 알림 내역.',
  robots: { index: false, follow: false },
}

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read_at: string | null
  created_at: string
}

export default async function NotificationsPage() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return (
      <div className="p-8">
        <p className="text-sm text-slate-600">로그인이 필요합니다.</p>
      </div>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) {
    return (
      <div className="p-8">
        <p className="text-sm text-slate-600">사업자 계정이 없습니다.</p>
      </div>
    )
  }

  const { data: rows } = await db
    .from('b2b_notifications')
    .select('id, type, title, body, link, read_at, created_at')
    .eq('account_id', account.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const items: Notification[] = rows ?? []
  const unreadCount = items.filter((n) => !n.read_at).length

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">알림</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          최근 100건. 안 읽은 알림: <span className="font-bold text-indigo-700">{unreadCount}건</span>
        </p>
      </header>

      <NotificationList initialItems={items} />
    </div>
  )
}
