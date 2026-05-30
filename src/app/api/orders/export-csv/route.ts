/**
 * GET /api/orders/export-csv?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * 셀러 본인 주문을 CSV 로 다운로드 (부가세 자료 / 회계 자료용).
 * - 기간 미지정 시: 이번 달 1일 ~ 현재
 * - 한국 회계 관행에 맞춘 21 컬럼 (마켓 주문번호, 셀러 번호, 주문일, 구매자
 *   기본 정보, 마켓·매입처·상품, 매입가, 환율 환산 KRW, 판매가, 마진)
 * - UTF-8 BOM + RFC4180 (쉼표 escape) — 엑셀에서 바로 열림
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth/server'
import { getExchangeRates } from '@/lib/b2b/exchange-rate'
import { MARKETPLACES, SUPPLIER_SITES } from '@/lib/b2b/order-options'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MARKETPLACE_LABEL = new Map(MARKETPLACES.map((m) => [m.value, m.label]))
const SUPPLIER_LABEL = new Map(SUPPLIER_SITES.map((s) => [s.value, s.label]))

function csvEscape(v: unknown): string {
  if (v == null) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toIsoDate(s: string | null): string {
  if (!s) return ''
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const url = new URL(request.url)
  const fromStr = url.searchParams.get('from')
  const toStr = url.searchParams.get('to')

  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  const from = fromStr ? new Date(fromStr) : defaultFrom
  const to = toStr ? new Date(toStr) : now
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: 'from/to 날짜 형식이 잘못되었습니다.' }, { status: 400 })
  }
  // to 는 그 날의 23:59:59 까지 포함
  const toEnd = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999)

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id, business_name')
    .eq('user_id', user.id)
    .single()
  if (!account) {
    return NextResponse.json({ error: '사업자 계정이 없습니다.' }, { status: 404 })
  }

  const { data: orderRows, error } = await sb
    .from('b2b_orders')
    .select(
      'id, order_number, market_order_number, marketplace, order_date, status, buyer_name, buyer_phone, buyer_postal_code, buyer_address, buyer_customs_code, exchange_rate_applied, b2b_order_items(display_order, product_name, supplier_site, quantity, currency, unit_price_foreign, sale_price_krw)',
    )
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .gte('order_date', from.toISOString().slice(0, 10))
    .lte('order_date', toEnd.toISOString().slice(0, 10))
    .order('order_date', { ascending: true })
    .limit(10000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  type ItemRow = {
    display_order: number
    product_name: string
    supplier_site: string | null
    quantity: number
    currency: string | null
    unit_price_foreign: number | string | null
    sale_price_krw: number | string | null
  }
  type RateMap = Record<string, { rate: number; unit: number }>
  type OrderRow = {
    id: string
    order_number: string
    market_order_number: string | null
    marketplace: string | null
    order_date: string
    status: string
    buyer_name: string | null
    buyer_phone: string | null
    buyer_postal_code: string | null
    buyer_address: string | null
    buyer_customs_code: string | null
    exchange_rate_applied: unknown
    b2b_order_items: ItemRow[] | null
  }
  const orders = (orderRows as OrderRow[] | null) ?? []

  // 라이브 환율 (스냅샷 없는 과거 주문의 fallback — 실패 시 KRW 만 환산 가능)
  let liveRates: RateMap = {}
  try {
    const r = await getExchangeRates()
    for (const [k, v] of Object.entries(r.rates)) {
      liveRates[k] = { rate: v.rate, unit: v.unit }
    }
  } catch {
    liveRates = {}
  }

  // 주문에 저장된 매입 시점 환율 스냅샷 → rate map. 형식이 깨졌으면 null.
  function snapshotRates(snap: unknown): RateMap | null {
    if (!snap || typeof snap !== 'object') return null
    const ratesObj = (snap as { rates?: unknown }).rates
    if (!ratesObj || typeof ratesObj !== 'object') return null
    const out: RateMap = {}
    for (const [k, v] of Object.entries(ratesObj as Record<string, unknown>)) {
      if (v && typeof v === 'object') {
        const rate = Number((v as { rate?: unknown }).rate)
        const unit = Number((v as { unit?: unknown }).unit)
        if (Number.isFinite(rate) && rate > 0) {
          out[k] = { rate, unit: Number.isFinite(unit) && unit > 0 ? unit : 1 }
        }
      }
    }
    return Object.keys(out).length > 0 ? out : null
  }

  function toKrw(amount: number, currency: string | null, rates: RateMap): number | null {
    if (currency == null || currency === 'KRW') return amount
    const r = rates[currency]
    if (!r) return null
    return Math.round((amount * r.rate) / (r.unit || 1))
  }

  // CSV 헤더
  const headers = [
    '주문일',
    '마켓',
    '마켓 주문번호',
    '셀러 주문번호',
    '상태',
    '구매자명',
    '구매자 전화',
    '우편번호',
    '주소',
    '통관코드',
    '상품 순번',
    '상품명',
    '해외 매입처',
    '수량',
    '매입 통화',
    '해외 단가',
    '해외 합계',
    'KRW 환산 매입가',
    '판매가 KRW',
    '예상 마진 KRW',
    '환율 기준',
  ]

  const lines: string[] = [headers.join(',')]

  for (const o of orders) {
    const items = (o.b2b_order_items ?? []).slice().sort((a, b) => a.display_order - b.display_order)
    if (items.length === 0) {
      // 라인 없으면 헤더 정보만 1줄
      lines.push(
        [
          toIsoDate(o.order_date),
          MARKETPLACE_LABEL.get(o.marketplace ?? '') ?? (o.marketplace ?? ''),
          o.market_order_number ?? '',
          o.order_number,
          o.status,
          o.buyer_name ?? '',
          o.buyer_phone ?? '',
          o.buyer_postal_code ?? '',
          o.buyer_address ?? '',
          o.buyer_customs_code ?? '',
          '', '', '', '', '', '', '', '', '', '', '',
        ].map(csvEscape).join(','),
      )
      continue
    }
    // 매입 시점 환율 스냅샷 우선, 없으면 라이브 환율로 추정
    const snap = snapshotRates(o.exchange_rate_applied)
    const orderRates = snap ?? liveRates
    const rateBasis = snap ? '매입시점' : '현재환율(추정)'
    for (const it of items) {
      const qty = Number(it.quantity) || 0
      const up = Number(it.unit_price_foreign) || 0
      const totalForeign = qty > 0 && up > 0 ? qty * up : null
      const krw = totalForeign != null ? toKrw(totalForeign, it.currency, orderRates) : null
      const sale = Number(it.sale_price_krw)
      const saleKrw = Number.isFinite(sale) && sale > 0 ? sale : null
      const margin = krw != null && saleKrw != null ? saleKrw - krw : null
      // 외화 매입가가 있고 KRW 환산이 된 경우에만 환율 기준 표기 (KRW·환산불가 행은 공란)
      const basisCell = totalForeign != null && krw != null && it.currency && it.currency !== 'KRW' ? rateBasis : ''
      lines.push(
        [
          toIsoDate(o.order_date),
          MARKETPLACE_LABEL.get(o.marketplace ?? '') ?? (o.marketplace ?? ''),
          o.market_order_number ?? '',
          o.order_number,
          o.status,
          o.buyer_name ?? '',
          o.buyer_phone ?? '',
          o.buyer_postal_code ?? '',
          o.buyer_address ?? '',
          o.buyer_customs_code ?? '',
          String(it.display_order),
          it.product_name,
          SUPPLIER_LABEL.get(it.supplier_site ?? '') ?? (it.supplier_site ?? ''),
          String(qty),
          it.currency ?? '',
          totalForeign != null ? up.toString() : '',
          totalForeign != null ? totalForeign.toString() : '',
          krw != null ? krw.toString() : '',
          saleKrw != null ? saleKrw.toString() : '',
          margin != null ? margin.toString() : '',
          basisCell,
        ].map(csvEscape).join(','),
      )
    }
  }

  const csv = lines.join('\r\n') + '\r\n'
  const BOM = '﻿' // 엑셀에서 UTF-8 한글 정상 표시
  const filename = `jimscanner_orders_${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}.csv`

  return new NextResponse(BOM + csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
      'X-Row-Count': String(lines.length - 1),
      'X-Order-Count': String(orders.length),
    },
  })
}
