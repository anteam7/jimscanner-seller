import type { Metadata } from 'next'
import { createClient } from '@/lib/auth/server'
import NewOrderForm, { type ForwarderOption } from './NewOrderForm'

export const metadata: Metadata = {
  title: '새 주문 입력',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

export default async function NewOrderPage() {
  const supabase = await createClient()

  // forwarders 는 public read 허용 (main repo schema)
  const { data: rows } = await supabase
    .from('forwarders')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name', { ascending: true })
    .returns<ForwarderOption[]>()

  const forwarders = rows ?? []

  return <NewOrderForm forwarders={forwarders} />
}
