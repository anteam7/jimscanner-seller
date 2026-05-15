import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createAdminClient() as any
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (account) {
    await db.from('b2b_audit_log').insert({
      account_id: account.id,
      user_id: user.id,
      action: '2fa_enabled',
      target_type: 'account',
      target_id: account.id,
      metadata: { method: 'totp' },
    })
  }

  return NextResponse.json({ ok: true })
}
