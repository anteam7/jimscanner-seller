/**
 * #idea-21 주간 운영 요약 다이제스트.
 *
 * 지난주(월~일 KST)와 이번주(월~현재 KST) 두 스냅샷을 계산한다.
 * - 지난주는 전전주 대비 WoW(전주比) 화살표를 함께 제공.
 * - 이번주는 진행 중이라 WoW 비교 없이 raw 수치만.
 *
 * 마진 계산은 analytics 페이지와 동일한 규칙:
 *   판매 = sale_price_krw 합, 매입 = qty × unit_price_foreign → KRW(환율) 합,
 *   마진 = 판매 − 매입 (판매>0 && 매입 환산 누락 없음 && 매입>0 일 때만 known).
 *
 * 호출 측(서버 컴포넌트)에서 createClient 로 인증 검증 후 본인 account_id 만 넘긴다.
 * RLS 우회를 위해 내부적으로 admin client 사용.
 */
import { createAdminClient } from '@/lib/auth/admin-supabase'

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export type RatesMap = Record<string, { rate: number; unit: number }>

export type DigestSnapshot = {
  /** KST 시작일 (포함) YYYY-MM-DD */
  startKst: string
  /** KST 종료일 (포함) YYYY-MM-DD — 지난주=일요일, 이번주=오늘 */
  endKst: string
  /** 진행 중인 주간이면 true (이번주) */
  partial: boolean
  orderCount: number
  saleKrw: number
  purchaseKrw: number
  marginKrw: number
  /** 마진을 신뢰할 수 있는지 (환율 환산 누락·판매 0 이면 false) */
  marginKnown: boolean
  marginRate: number | null
  /** 그 주 등록된 영수증 중 아직 미매칭 */
  unmatchedReceipts: number
  /** 그 주 주문 중 아직 매입 미진행(pending) */
  pendingPurchase: number
  /** 그 주 주문 중 현재 도착/완료 상태 */
  arrived: number
  /** 전주比 — 지난주 스냅샷에만 의미. 이전 기간 0 이면 null */
  wowOrdersPct: number | null
  wowSalePct: number | null
  wowMarginPct: number | null
}

export type WeeklyDigest = {
  lastWeek: DigestSnapshot
  thisWeek: DigestSnapshot
}

type WeekRange = {
  startUtcMs: number
  endUtcMs: number
  startKst: string
  endKstInclusive: string
}

function kstDateKey(utcMs: number): string {
  const k = new Date(utcMs + KST_OFFSET_MS)
  const y = k.getUTCFullYear()
  const m = String(k.getUTCMonth() + 1).padStart(2, '0')
  const d = String(k.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * weeksAgo 만큼 이전 KST 주(월요일 00:00 KST 시작)의 [start, end) UTC 경계.
 * weeksAgo=0 → 이번주, 1 → 지난주, 2 → 전전주.
 */
function kstWeekRange(nowMs: number, weeksAgo: number): WeekRange {
  const kst = new Date(nowMs + KST_OFFSET_MS)
  const dow = kst.getUTCDay() // 0=일 .. 6=토 (KST 기준)
  const daysSinceMon = (dow + 6) % 7
  // 오늘 KST 자정의 "wall ms" (UTC 처럼 다룬 KST 벽시계 ms)
  const kstMidnightToday = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate())
  const thisWeekStartWall = kstMidnightToday - daysSinceMon * DAY_MS
  const startWall = thisWeekStartWall - weeksAgo * 7 * DAY_MS
  // 실제 UTC instant = KST 벽시계 − offset
  const startUtcMs = startWall - KST_OFFSET_MS
  const endUtcMs = startUtcMs + 7 * DAY_MS
  return {
    startUtcMs,
    endUtcMs,
    startKst: kstDateKey(startUtcMs),
    endKstInclusive: kstDateKey(startUtcMs + 6 * DAY_MS),
  }
}

const ARRIVED_STATUSES = new Set(['arrived_korea', 'delivered', 'completed'])

type OrderItemRow = {
  quantity: number | null
  currency: string | null
  unit_price_foreign: number | string | null
  sale_price_krw: number | string | null
}
type OrderRow = {
  created_at: string
  status: string
  b2b_order_items: OrderItemRow[] | null
}

type Accum = {
  orderCount: number
  saleKrw: number
  purchaseKrw: number
  marginKrw: number
  saleKnown: number // 마진 known 주문의 판매액 합 (마진율 분모)
  marginKnown: boolean
  pendingPurchase: number
  arrived: number
}

function emptyAccum(): Accum {
  return {
    orderCount: 0,
    saleKrw: 0,
    purchaseKrw: 0,
    marginKrw: 0,
    saleKnown: 0,
    marginKnown: false,
    pendingPurchase: 0,
    arrived: 0,
  }
}

function pctChange(now: number, prev: number): number | null {
  if (prev <= 0) return null
  return ((now - prev) / prev) * 100
}

/**
 * 주간 다이제스트 계산. ratesMap 이 비어 있으면 외화 매입은 환산 누락으로 처리되어
 * 마진은 known=false 가 된다 (analytics 와 동일).
 */
export async function getWeeklyDigest(
  accountId: string,
  ratesMap: RatesMap,
  nowMs: number,
): Promise<WeeklyDigest> {
  const admin = createAdminClient()

  const thisRange = kstWeekRange(nowMs, 0)
  const lastRange = kstWeekRange(nowMs, 1)
  const beforeRange = kstWeekRange(nowMs, 2)

  // 주문: 전전주 시작 ~ 현재. created_at 기준 KST 주차 버킷팅.
  const ordersFromIso = new Date(beforeRange.startUtcMs).toISOString()
  const { data: orderRowsRaw } = await admin
    .from('b2b_orders')
    .select('created_at, status, b2b_order_items(quantity, currency, unit_price_foreign, sale_price_krw)')
    .eq('account_id', accountId)
    .is('deleted_at', null)
    .gte('created_at', ordersFromIso)

  function toKrw(amount: number, currency: string): number | null {
    if (currency === 'KRW') return amount
    const r = ratesMap[currency]
    if (!r) return null
    return (amount * r.rate) / (r.unit || 1)
  }

  const before = emptyAccum()
  const last = emptyAccum()
  const cur = emptyAccum()

  for (const o of (orderRowsRaw as OrderRow[] | null) ?? []) {
    const t = new Date(o.created_at).getTime()
    if (!Number.isFinite(t)) continue
    let acc: Accum | null = null
    if (t >= thisRange.startUtcMs && t < thisRange.endUtcMs) acc = cur
    else if (t >= lastRange.startUtcMs && t < lastRange.endUtcMs) acc = last
    else if (t >= beforeRange.startUtcMs && t < beforeRange.endUtcMs) acc = before
    if (!acc) continue

    acc.orderCount += 1
    if (o.status === 'pending') acc.pendingPurchase += 1
    if (ARRIVED_STATUSES.has(o.status)) acc.arrived += 1

    let orderSale = 0
    let orderPurchase = 0
    let purchaseKnown = true
    for (const it of o.b2b_order_items ?? []) {
      const sale = Number(it.sale_price_krw)
      if (Number.isFinite(sale) && sale > 0) orderSale += sale
      const qty = Number(it.quantity) || 0
      const up = Number(it.unit_price_foreign) || 0
      const curr = it.currency ?? 'KRW'
      if (qty > 0 && up > 0) {
        const krw = toKrw(qty * up, curr)
        if (krw == null) purchaseKnown = false
        else orderPurchase += krw
      }
    }
    acc.saleKrw += orderSale
    acc.purchaseKrw += orderPurchase
    if (orderSale > 0 && purchaseKnown && orderPurchase > 0) {
      acc.marginKrw += orderSale - orderPurchase
      acc.saleKnown += orderSale
      acc.marginKnown = true
    }
  }

  // 영수증: 지난주·이번주 각각 그 주 등록분 중 미매칭 카운트 (head:true count)
  const [lastUnmatchedRes, thisUnmatchedRes] = await Promise.all([
    admin
      .from('b2b_supplier_purchases')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .is('matched_order_id', null)
      .gte('created_at', new Date(lastRange.startUtcMs).toISOString())
      .lt('created_at', new Date(lastRange.endUtcMs).toISOString()),
    admin
      .from('b2b_supplier_purchases')
      .select('id', { count: 'exact', head: true })
      .eq('account_id', accountId)
      .is('matched_order_id', null)
      .gte('created_at', new Date(thisRange.startUtcMs).toISOString())
      .lt('created_at', new Date(thisRange.endUtcMs).toISOString()),
  ])

  function toSnapshot(
    acc: Accum,
    range: WeekRange,
    partial: boolean,
    prev: Accum | null,
    unmatched: number,
  ): DigestSnapshot {
    const marginRate =
      acc.marginKnown && acc.saleKnown > 0 ? (acc.marginKrw / acc.saleKnown) * 100 : null
    return {
      startKst: range.startKst,
      endKst: partial ? kstDateKey(nowMs) : range.endKstInclusive,
      partial,
      orderCount: acc.orderCount,
      saleKrw: acc.saleKrw,
      purchaseKrw: acc.purchaseKrw,
      marginKrw: acc.marginKrw,
      marginKnown: acc.marginKnown,
      marginRate,
      unmatchedReceipts: unmatched,
      pendingPurchase: acc.pendingPurchase,
      arrived: acc.arrived,
      wowOrdersPct: prev ? pctChange(acc.orderCount, prev.orderCount) : null,
      wowSalePct: prev ? pctChange(acc.saleKrw, prev.saleKrw) : null,
      wowMarginPct:
        prev && prev.marginKnown && acc.marginKnown
          ? pctChange(acc.marginKrw, prev.marginKrw)
          : null,
    }
  }

  return {
    lastWeek: toSnapshot(last, lastRange, false, before, lastUnmatchedRes.count ?? 0),
    thisWeek: toSnapshot(cur, thisRange, true, null, thisUnmatchedRes.count ?? 0),
  }
}
