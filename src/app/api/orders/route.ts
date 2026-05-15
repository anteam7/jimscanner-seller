import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VALID_CURRENCIES = ['USD', 'JPY', 'CNY', 'EUR', 'KRW']

type ItemInput = {
  product_name?: unknown
  product_url?: unknown
  quantity?: unknown
  currency?: unknown
  unit_price_foreign?: unknown
  weight_kg?: unknown
}

type CreateOrderBody = {
  order_number?: unknown
  order_date?: unknown
  client_display_name?: unknown
  request_notes?: unknown
  items?: unknown
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const trimmed = v.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

function nonNegNumber(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function posInt(v: unknown, fallback = 1): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.floor(n)
}

function isISODate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

export async function GET(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any

  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!account) {
    return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })
  }

  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const q = url.searchParams.get('q')
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 50), 1), 200)

  let qb = db
    .from('b2b_orders')
    .select(
      'id, order_number, status, order_date, estimated_cost_krw, request_notes, created_at, b2b_clients(display_name), b2b_order_items(product_name)',
    )
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) qb = qb.eq('status', status)
  if (q) qb = qb.ilike('order_number', `%${q.replace(/[%,]/g, '')}%`)

  const { data, error } = await qb
  if (error) {
    return NextResponse.json({ error: '주문 목록을 가져오지 못했습니다.' }, { status: 500 })
  }
  return NextResponse.json({ orders: data ?? [] })
}

export async function POST(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let body: CreateOrderBody
  try {
    body = (await request.json()) as CreateOrderBody
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const orderNumber = str(body.order_number, 64)
  if (!orderNumber) {
    return NextResponse.json({ error: '주문번호를 입력해 주세요.' }, { status: 400 })
  }

  const orderDate = isISODate(body.order_date)
    ? body.order_date
    : new Date().toISOString().slice(0, 10)

  const clientDisplayName = str(body.client_display_name, 120)
  const requestNotes = str(body.request_notes, 2000)

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: '상품을 1개 이상 입력해 주세요.' }, { status: 400 })
  }

  // 라인 아이템 정규화
  const items = (body.items as ItemInput[]).map((it, idx) => {
    const productName = str(it.product_name, 300)
    if (!productName) return null
    const quantity = posInt(it.quantity, 1)
    const currencyRaw = typeof it.currency === 'string' ? it.currency.toUpperCase() : null
    const currency = currencyRaw && VALID_CURRENCIES.includes(currencyRaw) ? currencyRaw : null
    const unitPrice = nonNegNumber(it.unit_price_foreign)
    const weight = nonNegNumber(it.weight_kg)
    const totalForeign = unitPrice != null ? Number((unitPrice * quantity).toFixed(2)) : null
    return {
      display_order: idx,
      product_name: productName,
      product_url: str(it.product_url, 500),
      quantity,
      currency,
      unit_price_foreign: unitPrice,
      total_price_foreign: totalForeign,
      weight_kg: weight,
    }
  })

  if (items.some((x) => x === null) || items.length === 0) {
    return NextResponse.json({ error: '상품명을 모두 입력해 주세요.' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any

  // 사업자 계정
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!account) {
    return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })
  }

  // 쿼터 / grace period 체크
  const { data: sub } = await db
    .from('b2b_subscriptions')
    .select(
      'monthly_order_used, monthly_order_quota_override, status, b2b_subscription_plans(monthly_order_quota)',
    )
    .eq('account_id', account.id)
    .single()

  if (sub) {
    if (sub.status === 'past_due') {
      return NextResponse.json(
        { error: '결제 실패 상태에서는 신규 주문을 등록할 수 없습니다. 결제 정보를 먼저 갱신해 주세요.' },
        { status: 402 },
      )
    }
    const planQuota: number | null = sub.b2b_subscription_plans?.monthly_order_quota ?? null
    const effective: number | null = sub.monthly_order_quota_override ?? planQuota
    const used: number = sub.monthly_order_used ?? 0
    if (effective !== null && used >= effective) {
      return NextResponse.json(
        { error: `이번 달 주문 한도(${effective}건)를 초과했습니다. 플랜 업그레이드를 검토해 주세요.` },
        { status: 403 },
      )
    }
  }

  // 의뢰자 자동 upsert (display_name 기준 — 같은 이름이 있으면 재사용)
  let clientId: string | null = null
  if (clientDisplayName) {
    const { data: existing } = await db
      .from('b2b_clients')
      .select('id')
      .eq('account_id', account.id)
      .eq('display_name', clientDisplayName)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle()

    if (existing?.id) {
      clientId = existing.id
    } else {
      const { data: inserted, error: cErr } = await db
        .from('b2b_clients')
        .insert({
          account_id: account.id,
          display_name: clientDisplayName,
        })
        .select('id')
        .single()
      if (cErr || !inserted) {
        return NextResponse.json({ error: '의뢰자 등록 중 오류가 발생했습니다.' }, { status: 500 })
      }
      clientId = inserted.id
    }
  }

  // 주문 insert
  const { data: order, error: oErr } = await db
    .from('b2b_orders')
    .insert({
      account_id: account.id,
      client_id: clientId,
      order_number: orderNumber,
      order_date: orderDate,
      source: 'manual',
      status: 'pending',
      request_notes: requestNotes,
    })
    .select('id')
    .single()

  if (oErr || !order) {
    const msg =
      (oErr as { code?: string } | null)?.code === '23505'
        ? '같은 주문번호가 이미 존재합니다.'
        : '주문 등록 중 오류가 발생했습니다.'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // 라인 아이템 insert
  const { error: iErr } = await db
    .from('b2b_order_items')
    .insert(items.map((it) => ({ ...it, order_id: order.id })))

  if (iErr) {
    // 라인 실패 시 주문 자체는 남기되 에러 회신 — 운영자가 확인 후 보정 가능
    return NextResponse.json(
      { error: '주문은 생성됐으나 상품 등록에 실패했습니다. 운영팀에 문의해 주세요.', order_id: order.id },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, id: order.id, order_number: orderNumber }, { status: 201 })
}
