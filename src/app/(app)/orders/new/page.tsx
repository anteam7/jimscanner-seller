import type { Metadata } from 'next'
import { createClient } from '@/lib/auth/server'
import NewOrderForm, { type ForwarderOption } from './NewOrderForm'

export const metadata: Metadata = {
  title: '새 주문 입력 | 짐스캐너 B2B',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

export default async function NewOrderPage() {
  const supabase = await createClient()

  // forwarders 는 public read 허용 (main repo schema)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = (await (supabase as any)
    .from('forwarders')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name', { ascending: true })) as { data: ForwarderOption[] | null }

  const forwarders = rows ?? []

  return <NewOrderForm forwarders={forwarders} />
}
