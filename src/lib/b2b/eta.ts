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
 * 국가 코드/명칭 alias → 시드 canonical 코드.
 * 시드는 ISO-3166 alpha-2 가 아닌 'UK' (GB), 'US' 등을 씀 — 외부 데이터·수기 입력이
 * 'GB'·'England'·'USA' 같은 변형으로 들어와도 같은 시드 row 로 매칭되게 정규화.
 * 미등록 값은 그대로 (대문자) 반환 — OTHER fallback 으로 흘러감.
 */
const ORIGIN_COUNTRY_ALIASES: Record<string, string> = {
  GB: 'UK', GBR: 'UK', ENGLAND: 'UK', BRITAIN: 'UK', SCOTLAND: 'UK', WALES: 'UK',
  'UNITED KINGDOM': 'UK', 'GREAT BRITAIN': 'UK',
  USA: 'US', AMERICA: 'US', 'UNITED STATES': 'US', 'UNITED STATES OF AMERICA': 'US',
  JPN: 'JP', JAPAN: 'JP',
  CHN: 'CN', CHINA: 'CN',
  DEU: 'DE', GERMANY: 'DE',
  HKG: 'HK', 'HONG KONG': 'HK',
}

/**
 * forwarder_country 값을 시드 canonical 코드로 정규화.
 * 'gb' → 'UK', 'England' → 'UK', 'USA' → 'US'. 빈 값은 'OTHER'.
 */
export function normalizeOriginCountry(raw: string | null | undefined): string {
  const v = (raw || '').trim().toUpperCase()
  if (!v) return 'OTHER'
  return ORIGIN_COUNTRY_ALIASES[v] ?? v
}

/**
 * origin_country 와 method 를 key 로 한 lookup map 생성.
 * key: `${normalize(country)}|${method}` — 'US|air'
 */
export function buildEtaLookup(rows: TransitDefault[]): EtaLookup {
  const map: EtaLookup = new Map()
  for (const r of rows) {
    const key = `${normalizeOriginCountry(r.origin_country)}|${r.method || 'air'}`
    map.set(key, r)
  }
  return map
}

export type SellerTransitOverride = {
  origin_country: string
  method: string
  avg_transit_days: number
}

/**
 * 셀러별 운송일수 보정을 글로벌 lookup 위에 덮어쓴다.
 * 같은 (origin_country, method) 키가 있으면 override 가 우선.
 * min/max 는 override 에 없으므로 글로벌 값을 유지(있으면)하되 avg 만 교체.
 * 원본 lookup 은 변경하지 않고 새 Map 을 반환한다.
 */
export function applyTransitOverrides(
  lookup: EtaLookup,
  overrides: SellerTransitOverride[],
): EtaLookup {
  const map: EtaLookup = new Map(lookup)
  for (const o of overrides) {
    const key = `${normalizeOriginCountry(o.origin_country)}|${o.method || 'air'}`
    const base = map.get(key)
    map.set(key, {
      origin_country: normalizeOriginCountry(o.origin_country),
      method: o.method || 'air',
      avg_transit_days: o.avg_transit_days,
      min_transit_days: base?.min_transit_days ?? null,
      max_transit_days: base?.max_transit_days ?? null,
    })
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
  const country = normalizeOriginCountry(order.forwarder_country)
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
