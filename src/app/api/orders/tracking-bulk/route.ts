/**
 * POST /api/orders/tracking-bulk
 *
 * 운송장 일괄 입력 — supplier_order_number (또는 셀러 order_number) 기준으로
 * 해당하는 b2b_order_items 행에 tracking_number_overseas / carrier 매핑.
 *
 * 본문:
 * {
 *   rows: Array<{
 *     key: string                  // supplier_order_number 또는 셀러 order_number
 *     tracking_number_overseas: string
 *     carrier?: string | null
 *   }>
 * }
 *
 * 응답:
 * {
 *   matched: number               // 업데이트된 라인 수
 *   skipped_no_match: string[]    // key 매칭 실패
 *   skipped_invalid: string[]     // 빈 값 등
 *   updated: Array<{ key, item_id, order_id, order_number, status_transitioned: boolean }>
 * }
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Row = {
  key?: unknown
  tracking_number_overseas?: unknown
  carrier?: unknown
}

type Body = {
  rows?: Row[]
}

function clean(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t) return null
  return t.slice(0, max)
}

export async function POST(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) {
    return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: '입력 행이 비어 있습니다.' }, { status: 400 })
  }
  if (body.rows.length > 500) {
    return NextResponse.json({ error: '한 번에 최대 500행까지 입력할 수 있습니다.' }, { status: 400 })
  }

  type Normalized = { key: string; tracking: string; carrier: string | null }
  const normalized: Normalized[] = []
  const skippedInvalid: string[] = []
  for (const r of body.rows) {
    const key = clean(r.key, 128)
    const tracking = clean(r.tracking_number_overseas, 128)
    const carrier = clean(r.carrier, 64)
    if (!key || !tracking) {
      skippedInvalid.push(typeof r.key === 'string' ? r.key.slice(0, 64) : '')
      continue
    }
    normalized.push({ key, tracking, carrier })
  }

  if (normalized.length === 0) {
    return NextResponse.json({
      matched: 0,
      skipped_no_match: [],
      skipped_invalid: skippedInvalid,
      updated: [],
    })
  }

  const admin = createAdminClient()
  const uniqueKeys = Array.from(new Set(normalized.map((n) => n.key)))

  // 1) supplier_order_number 로 라인 매칭
  const { data: itemsBySupplier } = await admin
    .from('b2b_order_items')
    .select('id, order_id, supplier_order_number')
    .in('supplier_order_number', uniqueKeys)

  // 2) 셀러 order_number 로 주문 매칭 (라인 1건이면 자동 적용, 다건이면 모두에 적용)
  const { data: ordersByNumber } = await admin
    .from('b2b_orders')
    .select('id, order_number, status, account_id')
    .eq('account_id', account.id)
    .in('order_number', uniqueKeys)
    .is('deleted_at', null)

  const ownOrderIds = new Set<string>((ordersByNumber ?? []).map((o) => o.id))
  const orderNumberById = new Map<string, string>(
    (ordersByNumber ?? []).map((o) => [o.id, o.order_number]),
  )

  // 라인의 order_id 가 본인 계정 소속인지 확인
  type ItemRow = { id: string; order_id: string; supplier_order_number: string | null }
  const supplierItems = ((itemsBySupplier ?? []) as ItemRow[]).filter((it) => {
    return ownOrderIds.has(it.order_id) || false
  })
  // supplier 매칭에서 누락된 라인은 별도로 본인 계정 주문에 한해 fetch 해서 안전 검증
  const supplierOrderIds = Array.from(new Set((itemsBySupplier ?? []).map((it) => it.order_id)))
  const missingOrderIds = supplierOrderIds.filter((id) => !ownOrderIds.has(id))
  if (missingOrderIds.length > 0) {
    const { data: ownerCheck } = await admin
      .from('b2b_orders')
      .select('id')
      .eq('account_id', account.id)
      .in('id', missingOrderIds)
      .is('deleted_at', null)
    for (const o of (ownerCheck ?? []) as { id: string }[]) {
      ownOrderIds.add(o.id)
      const order = (ordersByNumber ?? []).find((x) => x.id === o.id)
      if (order) orderNumberById.set(o.id, order.order_number)
    }
    // 다시 필터
    for (const it of (itemsBySupplier ?? []) as ItemRow[]) {
      if (ownOrderIds.has(it.order_id) && !supplierItems.find((s) => s.id === it.id)) {
        supplierItems.push(it)
      }
    }
  }

  // order_number → 라인 매칭 (해당 주문의 모든 라인)
  let lineItemsByOrder: { id: string; order_id: string }[] = []
  if (ordersByNumber && ordersByNumber.length > 0) {
    const { data: linesForOrders } = await admin
      .from('b2b_order_items')
      .select('id, order_id')
      .in('order_id', Array.from(ownOrderIds))
    lineItemsByOrder = (linesForOrders ?? []) as { id: string; order_id: string }[]
  }

  type UpdatedRow = { key: string; item_id: string; order_id: string; order_number: string; status_transitioned: boolean }
  const updated: UpdatedRow[] = []
  const skippedNoMatch: string[] = []

  // 키 기준으로 처리
  const supplierKeyMap = new Map<string, ItemRow[]>()
  for (const it of supplierItems) {
    if (!it.supplier_order_number) continue
    const arr = supplierKeyMap.get(it.supplier_order_number) ?? []
    arr.push(it)
    supplierKeyMap.set(it.supplier_order_number, arr)
  }
  const orderNumberMap = new Map<string, { id: string; order_number: string; status: string }>()
  for (const o of (ordersByNumber ?? []) as { id: string; order_number: string; status: string }[]) {
    orderNumberMap.set(o.order_number, o)
  }
  const linesByOrderId = new Map<string, string[]>()
  for (const li of lineItemsByOrder) {
    const arr = linesByOrderId.get(li.order_id) ?? []
    arr.push(li.id)
    linesByOrderId.set(li.order_id, arr)
  }

  for (const n of normalized) {
    // 우선 supplier_order_number 매칭
    const supplierHits = supplierKeyMap.get(n.key)
    if (supplierHits && supplierHits.length > 0) {
      for (const hit of supplierHits) {
        const patch: { tracking_number_overseas: string; carrier?: string | null } = {
          tracking_number_overseas: n.tracking,
        }
        if (n.carrier) patch.carrier = n.carrier
        // 사전 status 조회 (전이 감지)
        const orderRow = (ordersByNumber ?? []).find((o) => o.id === hit.order_id)
        const wasPaid = orderRow?.status === 'paid'
        const { error: upErr } = await admin
          .from('b2b_order_items')
          .update(patch)
          .eq('id', hit.id)
        if (upErr) continue
        updated.push({
          key: n.key,
          item_id: hit.id,
          order_id: hit.order_id,
          order_number: orderNumberById.get(hit.order_id) ?? '',
          status_transitioned: wasPaid,
        })
      }
      continue
    }
    // 셀러 order_number 매칭
    const orderHit = orderNumberMap.get(n.key)
    if (orderHit) {
      const lineIds = linesByOrderId.get(orderHit.id) ?? []
      if (lineIds.length === 0) {
        skippedNoMatch.push(n.key)
        continue
      }
      const wasPaid = orderHit.status === 'paid'
      const patch: { tracking_number_overseas: string; carrier?: string | null } = {
        tracking_number_overseas: n.tracking,
      }
      if (n.carrier) patch.carrier = n.carrier
      const { error: upErr } = await admin
        .from('b2b_order_items')
        .update(patch)
        .in('id', lineIds)
      if (upErr) continue
      for (const lineId of lineIds) {
        updated.push({
          key: n.key,
          item_id: lineId,
          order_id: orderHit.id,
          order_number: orderHit.order_number,
          status_transitioned: wasPaid,
        })
      }
      continue
    }
    skippedNoMatch.push(n.key)
  }

  return NextResponse.json({
    matched: updated.length,
    skipped_no_match: skippedNoMatch,
    skipped_invalid: skippedInvalid,
    updated,
  })
}
