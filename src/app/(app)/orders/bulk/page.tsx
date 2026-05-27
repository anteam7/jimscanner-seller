import type { Metadata } from 'next'
import { createClient } from '@/lib/auth/server'
import BulkOrderClient, { type ForwarderOption } from './BulkOrderClient'

export const metadata: Metadata = {
  title: '일괄 입력',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

export default async function BulkOrderPage() {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('forwarders')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name', { ascending: true })
    .returns<ForwarderOption[]>()

  return <BulkOrderClient forwarders={rows ?? []} />
}
