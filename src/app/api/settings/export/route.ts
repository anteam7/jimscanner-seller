/**
 * GET /api/settings/export
 *
 * 셀러 본인 데이터 전체 백업 — ZIP 으로 묶지 않고 JSON 한 번에 다운로드.
 * 이탈 대비·법규 (GDPR 유사) 데이터 이전 권리.
 *
 * 포함: orders·items·imports·forwarder_addresses·products·domestic_products·product_mappings
 * 제외: 다른 셀러 데이터·시스템 메타·확장 토큰·결제 정보
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id, email, business_name, business_no, ceo_name, phone, postal_code, address, detail_address, created_at')
    .eq('user_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })

  const admin = createAdminClient()
  const accountId = account.id

  const [orders, items, imports, addresses, products, domestic, mappings] = await Promise.all([
    admin.from('b2b_orders').select('*').eq('account_id', accountId).is('deleted_at', null),
    admin.from('b2b_order_items').select('*, b2b_orders!inner(account_id)').eq('b2b_orders.account_id', accountId),
    admin.from('b2b_supplier_purchases').select('*').eq('account_id', accountId),
    admin.from('b2b_forwarder_addresses').select('*').eq('account_id', accountId),
    admin.from('b2b_products').select('*').eq('account_id', accountId),
    admin.from('b2b_domestic_products').select('*').eq('account_id', accountId),
    admin.from('b2b_product_mappings').select('*').eq('account_id', accountId),
  ])

  const payload = {
    exported_at: new Date().toISOString(),
    schema_version: 1,
    account: {
      id: accountId,
      email: account.email,
      business_name: account.business_name,
      business_no: account.business_no,
      ceo_name: account.ceo_name,
      phone: account.phone,
      postal_code: account.postal_code,
      address: account.address,
      detail_address: account.detail_address,
      created_at: account.created_at,
    },
    orders: orders.data ?? [],
    order_items: items.data ?? [],
    supplier_purchases: imports.data ?? [],
    forwarder_addresses: addresses.data ?? [],
    products: products.data ?? [],
    domestic_products: domestic.data ?? [],
    product_mappings: mappings.data ?? [],
    counts: {
      orders: orders.data?.length ?? 0,
      order_items: items.data?.length ?? 0,
      supplier_purchases: imports.data?.length ?? 0,
      forwarder_addresses: addresses.data?.length ?? 0,
      products: products.data?.length ?? 0,
      domestic_products: domestic.data?.length ?? 0,
      product_mappings: mappings.data?.length ?? 0,
    },
  }

  const json = JSON.stringify(payload, null, 2)
  const date = new Date().toISOString().slice(0, 10)
  const filename = `jimscanner-export-${accountId.slice(0, 8)}-${date}.json`

  return new NextResponse(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
