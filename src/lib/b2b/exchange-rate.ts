import { unstable_cache } from 'next/cache'

// 한국수출입은행 기준환율 API — 매매기준율(deal_bas_r) 사용
// https://www.koreaexim.go.kr/ir/HPHKIR020M01
const KOREAEXIM_API = 'https://www.koreaexim.go.kr/site/program/financial/exchangeJSON'
const SUPPORTED_CURRENCIES = ['USD', 'JPY', 'CNY', 'EUR']

export type ExchangeRate = {
  currency: string
  /** 매매기준율 (KRW 기준). JPY는 100엔 기준 */
  rate: number
  /** 환율 단위: JPY = 100, 나머지 = 1 */
  unit: number
  fetchedAt: string
  isFallback: boolean
}

export type ExchangeRates = {
  rates: Record<string, ExchangeRate>
  fetchedAt: string
  /** true = 수출입은행 API 장애 → 직전 캐시값 */
  isFallback: boolean
}

// 동일 인스턴스 내 최후 성공 캐시 (API 장애 시 fallback 용)
let lastGoodSnapshot: ExchangeRates | null = null

// API key 무효 / 초기 cold start 등으로 최후 스냅샷도 없을 때 사용할 최종 fallback.
// 정확한 일일 환율은 아니지만 화면이 깨지는 것보다 보수적 기준값 노출이 낫다.
// 갱신 책임: 분기 1회 수동 점검.
const STATIC_FALLBACK: ExchangeRates = {
  rates: {
    USD: { currency: 'USD', rate: 1380, unit: 1, fetchedAt: '2026-01-01T00:00:00.000Z', isFallback: true },
    JPY: { currency: 'JPY', rate: 900, unit: 100, fetchedAt: '2026-01-01T00:00:00.000Z', isFallback: true },
    CNY: { currency: 'CNY', rate: 190, unit: 1, fetchedAt: '2026-01-01T00:00:00.000Z', isFallback: true },
    EUR: { currency: 'EUR', rate: 1500, unit: 1, fetchedAt: '2026-01-01T00:00:00.000Z', isFallback: true },
  },
  fetchedAt: '2026-01-01T00:00:00.000Z',
  isFallback: true,
}

async function fetchFromKoreaExim(): Promise<ExchangeRates> {
  const apiKey = process.env.KOREAEXIM_API_KEY
  if (!apiKey) throw new Error('KOREAEXIM_API_KEY env not set')

  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const searchdate = `${yyyy}${mm}${dd}`

  const url = `${KOREAEXIM_API}?authkey=${encodeURIComponent(apiKey)}&searchdate=${searchdate}&data=AP01`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`KoreaExim API ${res.status}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = await res.json()
  if (!Array.isArray(data) || data.length === 0) throw new Error('KoreaExim: empty response')

  const fetchedAt = now.toISOString()
  const rates: Record<string, ExchangeRate> = {}

  for (const item of data) {
    const rawUnit = String(item.cur_unit ?? '')
    // "JPY(100)" → currency="JPY", unit=100
    const currency = rawUnit.replace(/\(\d+\)/, '').trim()
    if (!SUPPORTED_CURRENCIES.includes(currency)) continue

    const rateStr = String(item.deal_bas_r ?? '').replace(/,/g, '')
    const rate = parseFloat(rateStr)
    if (isNaN(rate) || rate <= 0) continue

    const unit = rawUnit.includes('(100)') ? 100 : 1

    rates[currency] = { currency, rate, unit, fetchedAt, isFallback: false }
  }

  // USD·JPY·CNY 는 필수
  if (!rates['USD'] || !rates['JPY'] || !rates['CNY']) {
    throw new Error('KoreaExim: missing required currencies (USD/JPY/CNY)')
  }

  const result: ExchangeRates = { rates, fetchedAt, isFallback: false }
  lastGoodSnapshot = result
  return result
}

// Next.js Data Cache — 5분 TTL
const getCachedRates = unstable_cache(fetchFromKoreaExim, ['b2b-exchange-rates'], {
  revalidate: 300,
  tags: ['b2b-exchange-rates'],
})

/**
 * 특정 날짜의 환율 fetch (전일 비교용).
 * - 한국수출입은행은 주말·공휴일 환율을 별도로 제공하지 않으므로 빈 응답 시 하루씩 뒤로.
 * - 24시간 단위 캐싱 (날짜가 캐시 key 라 자연스럽게 갱신됨)
 */
async function fetchRatesForDate(searchdate: string): Promise<ExchangeRates | null> {
  const apiKey = process.env.KOREAEXIM_API_KEY
  if (!apiKey) return null

  const url = `${KOREAEXIM_API}?authkey=${encodeURIComponent(apiKey)}&searchdate=${searchdate}&data=AP01`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = await res.json()
  if (!Array.isArray(data) || data.length === 0) return null

  const fetchedAt = new Date().toISOString()
  const rates: Record<string, ExchangeRate> = {}
  for (const item of data) {
    const rawUnit = String(item.cur_unit ?? '')
    const currency = rawUnit.replace(/\(\d+\)/, '').trim()
    if (!SUPPORTED_CURRENCIES.includes(currency)) continue
    const rateStr = String(item.deal_bas_r ?? '').replace(/,/g, '')
    const rate = parseFloat(rateStr)
    if (isNaN(rate) || rate <= 0) continue
    const unit = rawUnit.includes('(100)') ? 100 : 1
    rates[currency] = { currency, rate, unit, fetchedAt, isFallback: false }
  }
  if (Object.keys(rates).length === 0) return null
  return { rates, fetchedAt, isFallback: false }
}

/**
 * 전일(영업일) 환율 — 24시간 캐싱.
 * 주말/공휴일이면 직전 영업일로 최대 7일 뒤로 탐색.
 */
async function fetchYesterdayRatesUncached(): Promise<ExchangeRates | null> {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  for (let i = 0; i < 7; i++) {
    const yyyy = yesterday.getFullYear()
    const mm = String(yesterday.getMonth() + 1).padStart(2, '0')
    const dd = String(yesterday.getDate()).padStart(2, '0')
    const result = await fetchRatesForDate(`${yyyy}${mm}${dd}`)
    if (result) return result
    yesterday.setDate(yesterday.getDate() - 1)
  }
  return null
}

const getCachedYesterdayRates = unstable_cache(
  fetchYesterdayRatesUncached,
  ['b2b-exchange-rates-yesterday'],
  { revalidate: 86400, tags: ['b2b-exchange-rates-yesterday'] },
)

export async function getYesterdayRates(): Promise<ExchangeRates | null> {
  try {
    return await getCachedYesterdayRates()
  } catch {
    return null
  }
}

/**
 * 한국수출입은행 기준환율 반환.
 * API 장애 시 직전 성공 스냅샷을 isFallback=true 로 반환.
 * KOREAEXIM_API_KEY 미설정 + 스냅샷 없음 → 에러 throw.
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  try {
    return await getCachedRates()
  } catch {
    if (lastGoodSnapshot) {
      const fallbackRates = Object.fromEntries(
        Object.entries(lastGoodSnapshot.rates).map(([k, v]) => [k, { ...v, isFallback: true }])
      )
      return { ...lastGoodSnapshot, rates: fallbackRates, isFallback: true }
    }
    return STATIC_FALLBACK
  }
}

/**
 * 주문 저장 시 환율 스냅샷을 b2b_orders.exchange_rate_applied jsonb 컬럼에 기록하기 위한 직렬화 형식.
 * Phase D (주문 생성 API) 구현 시 사용.
 */
export type ExchangeRateSnapshot = {
  rates: Record<string, { rate: number; unit: number }>
  fetchedAt: string
  isFallback: boolean
}

export function toSnapshot(rates: ExchangeRates): ExchangeRateSnapshot {
  return {
    rates: Object.fromEntries(
      Object.entries(rates.rates).map(([k, v]) => [k, { rate: v.rate, unit: v.unit }])
    ),
    fetchedAt: rates.fetchedAt,
    isFallback: rates.isFallback,
  }
}
