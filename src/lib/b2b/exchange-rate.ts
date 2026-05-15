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
 * 한국수출입은행 기준환율 반환.
 * API 장애 시 직전 성공 스냅샷을 isFallback=true 로 반환.
 * KOREAEXIM_API_KEY 미설정 + 스냅샷 없음 → 에러 throw.
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  try {
    return await getCachedRates()
  } catch (err) {
    if (lastGoodSnapshot) {
      const fallbackRates = Object.fromEntries(
        Object.entries(lastGoodSnapshot.rates).map(([k, v]) => [k, { ...v, isFallback: true }])
      )
      return { ...lastGoodSnapshot, rates: fallbackRates, isFallback: true }
    }
    throw err
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
