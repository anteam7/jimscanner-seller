import type { Metadata } from 'next'
import { createClient } from '@/lib/auth/server'
import BulkOrderClient, { type ForwarderOption } from './BulkOrderClient'

export const metadata: Metadata = {
  title: '일괄 입력 | 짐스캐너 B2B',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

export default async function BulkOrderPage() {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = (await (supabase as any)
    .from('forwarders')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name', { ascending: true })) as { data: ForwarderOption[] | null }

  return <BulkOrderClient forwarders={rows ?? []} />
}
