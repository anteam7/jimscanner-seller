// ETA (도착 예정일) 계산 helper
// 기준: forwarder_submitted_at 또는 order_date + avg_transit_days
// fallback: avg_transit_days_to_kr 없으면 OTHER 'air' 기본값 사용

export type TransitDefault = {
  origin_country: string
  method: string
  avg_transit_days: number
  min_transit_days: number | null
  max_transit_days: number | null
}

export type EtaLookup = Map<string, TransitDefault>

/**
 * origin_country 와 method 를 key 로 한 lookup map 생성.
 * key: `${UPPER(country)}|${method}` — 'US|air'
 */
export function buildEtaLookup(rows: TransitDefault[]): EtaLookup {
  const map: EtaLookup = new Map()
  for (const r of rows) {
    const key = `${(r.origin_country || '').toUpperCase()}|${r.method || 'air'}`
    map.set(key, r)
  }
  return map
}

/**
 * 주문의 ETA 계산.
 * - forwarder_submitted_at 있으면 그 시점 + transit 일수
 * - 없으면 order_date 또는 created_at 기준 + 3 (배대지 접수 평균) + transit
 */
export function computeOrderEta(
  order: {
    forwarder_country: string | null
    forwarder_submitted_at: string | null
    order_date: string | null
    created_at: string
  },
  lookup: EtaLookup,
  method: string = 'air',
): {
  eta: Date
  basis: 'forwarder_submitted' | 'order_date_estimated'
  days: number
  country: string
  unknownCountry: boolean
} {
  const country = (order.forwarder_country || 'OTHER').toUpperCase()
  const direct = lookup.get(`${country}|${method}`)
  const fallback = lookup.get('OTHER|air')
  const td = direct ?? fallback
  const days = td?.avg_transit_days ?? 10
  const unknownCountry = !direct

  let basis: 'forwarder_submitted' | 'order_date_estimated'
  let startDate: Date
  if (order.forwarder_submitted_at) {
    startDate = new Date(order.forwarder_submitted_at)
    basis = 'forwarder_submitted'
  } else {
    const seed = order.order_date ?? order.created_at
    startDate = new Date(seed)
    // 주문 → 배대지 접수까지 평균 3일 buffer
    startDate.setDate(startDate.getDate() + 3)
    basis = 'order_date_estimated'
  }

  const eta = new Date(startDate)
  eta.setDate(eta.getDate() + days)

  return { eta, basis, days, country, unknownCountry }
}

/**
 * 날짜를 KST 자정 기준 ISO date 문자열 (YYYY-MM-DD) 으로.
 */
export function toKstDateKey(d: Date): string {
  const utcMs = d.getTime()
  const kst = new Date(utcMs + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

/**
 * 이번주 (월~일), 다음주, 그 이후로 ETA 분류.
 * 기준: KST today
 */
export function classifyEtaBucket(eta: Date, today: Date): 'overdue' | 'this_week' | 'next_week' | 'later' {
  const todayKey = toKstDateKey(today)
  const etaKey = toKstDateKey(eta)
  if (etaKey < todayKey) return 'overdue'

  // 이번주 = today 부터 일요일까지 (KST 기준 주의 시작=월요일 가정)
  const kstToday = new Date(today.getTime() + 9 * 60 * 60 * 1000)
  // getUTCDay 는 일=0..토=6 — 월=1
  const dow = kstToday.getUTCDay()
  const daysToSunday = dow === 0 ? 0 : 7 - dow
  const sunday = new Date(kstToday)
  sunday.setUTCDate(kstToday.getUTCDate() + daysToSunday)
  const sundayKey = sunday.toISOString().slice(0, 10)
  if (etaKey <= sundayKey) return 'this_week'

  const nextSunday = new Date(sunday)
  nextSunday.setUTCDate(sunday.getUTCDate() + 7)
  const nextSundayKey = nextSunday.toISOString().slice(0, 10)
  if (etaKey <= nextSundayKey) return 'next_week'

  return 'later'
}

export function formatKstDate(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}
