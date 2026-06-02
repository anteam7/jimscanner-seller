/**
 * /imports 영수증 ↔ /orders 매칭 heuristic.
 * 셀러가 amazon US/JP 에서 매입한 영수증을 한국 마켓 주문 (b2b_orders) 의 line item 과 연결.
 *
 * 점수 계산:
 *   - supplier_site / source 일치: 필수 (0점 = 후보 제외)
 *   - currency 일치: +20
 *   - 날짜 근접도 (|order.created_at - receipt.purchased_at|): 0일 = 30, 1일 = 25, 3일 = 15, 7일 = 5, >14일 = 0
 *   - 금액 근접도: |receipt.total - sum(item.unit_price * qty)| / receipt.total
 *       <1% = 40, <3% = 30, <10% = 20, <25% = 10, >25% = 0
 *   - 이미 다른 receipt 가 매칭한 order 는 -10 (충돌 회피)
 */

export type ReceiptForMatching = {
  id: string
  source: string
  purchased_at: string | null
  currency: string | null
  total_foreign: number | string | null
}

export type OrderItemForMatching = {
  supplier_site: string | null
  currency: string | null
  qty: number | null
  unit_price_foreign: number | string | null
}

export type OrderForMatching = {
  id: string
  order_number: string | null
  market_order_number: string | null
  marketplace: string | null
  created_at: string
  has_matched_receipt: boolean
  items: OrderItemForMatching[]
}

export type MatchCandidate = {
  order: OrderForMatching
  score: number
  reasons: string[]
}

function toNum(v: number | string | null | undefined): number {
  if (v == null) return 0
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

function dateScore(receiptIso: string | null, orderIso: string): number {
  if (!receiptIso) return 5
  const r = Date.parse(receiptIso)
  const o = Date.parse(orderIso)
  if (!Number.isFinite(r) || !Number.isFinite(o)) return 0
  const days = Math.abs(o - r) / (1000 * 60 * 60 * 24)
  if (days <= 0.5) return 30
  if (days <= 1) return 25
  if (days <= 3) return 15
  if (days <= 7) return 5
  if (days <= 14) return 2
  return 0
}

function amountScore(receiptTotal: number, orderTotal: number): { score: number; pct: number } {
  if (receiptTotal <= 0 || orderTotal <= 0) return { score: 0, pct: Infinity }
  const pct = Math.abs(receiptTotal - orderTotal) / receiptTotal
  if (pct < 0.01) return { score: 40, pct }
  if (pct < 0.03) return { score: 30, pct }
  if (pct < 0.1) return { score: 20, pct }
  if (pct < 0.25) return { score: 10, pct }
  return { score: 0, pct }
}

export function scoreCandidate(
  receipt: ReceiptForMatching,
  order: OrderForMatching,
): MatchCandidate | null {
  // supplier_site 일치 필수 — 같은 source 의 라인이 1개라도 있어야 후보
  const matchingItems = order.items.filter((it) => it.supplier_site === receipt.source)
  if (matchingItems.length === 0) return null

  const reasons: string[] = []
  let score = 0

  // 통화 일치 (matching items 기준)
  const itemCurrencies = new Set(matchingItems.map((it) => (it.currency ?? '').toUpperCase()))
  if (receipt.currency && itemCurrencies.has(receipt.currency.toUpperCase())) {
    score += 20
    reasons.push(`통화 ${receipt.currency} 일치`)
  }

  // 날짜 근접도
  const dScore = dateScore(receipt.purchased_at, order.created_at)
  score += dScore
  if (dScore >= 25) reasons.push('매입일 ±1일 이내')
  else if (dScore >= 15) reasons.push('매입일 ±3일 이내')
  else if (dScore >= 5) reasons.push('매입일 ±7일 이내')

  // 금액 근접도 (matching items 만 합산)
  const receiptTotal = toNum(receipt.total_foreign)
  const orderItemsTotal = matchingItems.reduce(
    (acc, it) => acc + toNum(it.unit_price_foreign) * (toNum(it.qty) || 1),
    0,
  )
  const { score: aScore, pct } = amountScore(receiptTotal, orderItemsTotal)
  score += aScore
  if (aScore >= 30) reasons.push(`금액 일치 (${(pct * 100).toFixed(1)}% 차이)`)
  else if (aScore >= 20) reasons.push(`금액 근접 (${(pct * 100).toFixed(1)}% 차이)`)
  else if (aScore >= 10) reasons.push(`금액 ${(pct * 100).toFixed(0)}% 차이`)

  // 이미 다른 receipt 가 가져간 order 는 페널티
  if (order.has_matched_receipt) {
    score -= 10
    reasons.push('이미 다른 영수증과 매칭됨')
  }

  if (score < 10) return null

  return { order, score, reasons }
}

/**
 * 영수증 결제액(total_foreign) vs 주문 라인 합계(unit_price_foreign × qty) 비교.
 * 매칭/추천된 order 가 실제 영수증과 금액이 얼마나 벌어져 있는지 노출용 (분할발송·가격변동·부분취소 조기 감지).
 * - 같은 source 의 라인만 합산 (supplier_site === receipt.source)
 * - 통화 불일치 시 금액 비교 무의미 → currencyMismatch = true (환산 없이 경고만)
 * 비교 대상 라인이 없으면 null.
 */
export type AmountComparison = {
  receiptTotal: number
  orderTotal: number
  /** (영수증 - 주문) / 영수증. 음수 = 주문 합계가 더 큼(분할발송 의심), 양수 = 영수증이 더 큼. 영수증액 0 이면 0. */
  deltaPct: number
  currencyMismatch: boolean
  orderCurrency: string | null
}

export function compareAmounts(
  receipt: ReceiptForMatching,
  order: OrderForMatching,
): AmountComparison | null {
  const matchingItems = order.items.filter((it) => it.supplier_site === receipt.source)
  if (matchingItems.length === 0) return null

  const receiptTotal = toNum(receipt.total_foreign)
  const orderTotal = matchingItems.reduce(
    (acc, it) => acc + toNum(it.unit_price_foreign) * (toNum(it.qty) || 1),
    0,
  )

  const itemCurrencies = new Set(
    matchingItems.map((it) => (it.currency ?? '').toUpperCase()).filter(Boolean),
  )
  const rc = (receipt.currency ?? '').toUpperCase()
  const currencyMismatch = !!rc && itemCurrencies.size > 0 && !itemCurrencies.has(rc)
  const orderCurrency = matchingItems.find((it) => it.currency)?.currency ?? null

  const deltaPct = receiptTotal > 0 ? (receiptTotal - orderTotal) / receiptTotal : 0

  return { receiptTotal, orderTotal, deltaPct, currencyMismatch, orderCurrency }
}

export function findCandidates(
  receipt: ReceiptForMatching,
  orders: OrderForMatching[],
  limit = 3,
): MatchCandidate[] {
  const scored = orders
    .map((o) => scoreCandidate(receipt, o))
    .filter((c): c is MatchCandidate => c !== null)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}
