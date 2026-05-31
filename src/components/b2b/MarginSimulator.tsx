'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

type RateSnapshot = {
  rates: Record<string, { rate: number; unit: number }>
  fetchedAt: string
  isFallback: boolean
}

// 환율 지원 통화 + 한글 라벨 (exchange-rate.ts SUPPORTED_CURRENCIES 와 정렬)
const CURRENCY_LABELS: Record<string, string> = {
  USD: '미국 달러 ($)',
  JPY: '일본 엔 (¥, 100엔 기준)',
  CNY: '중국 위안 (¥)',
  EUR: '유로 (€)',
}

// 마켓 수수료 추정 기본값 (%) — 카테고리·계약에 따라 다르므로 셀러가 직접 조정.
// 일반적인 오픈마켓 판매 수수료 + 기본 결제수수료를 합친 보수적 추정치.
const MARKET_FEE_PRESETS: Array<{ value: string; label: string; fee: number }> = [
  { value: 'coupang', label: '쿠팡', fee: 10.8 },
  { value: 'smartstore', label: '스마트스토어', fee: 5.85 },
  { value: '11st', label: '11번가', fee: 12 },
  { value: 'gmarket', label: '지마켓', fee: 12 },
  { value: 'auction', label: '옥션', fee: 12 },
  { value: 'lotteon', label: '롯데온', fee: 11 },
  { value: 'own_mall', label: '자사몰 (PG만)', fee: 3 },
  { value: 'custom', label: '직접 입력', fee: 0 },
]

const LOW_MARGIN_PCT = 10 // 마진율 이 값 미만이면 주의(amber)

function formatKRW(v: number): string {
  if (!Number.isFinite(v)) return '—'
  return '₩' + Math.round(v).toLocaleString('ko-KR')
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  step = '1',
  min = '0',
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  suffix?: string
  step?: string
  min?: string
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">{label}</span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 tabular-nums shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            {suffix}
          </span>
        )}
      </div>
    </label>
  )
}

export default function MarginSimulator({ snapshot }: { snapshot: RateSnapshot }) {
  const currencyKeys = Object.keys(snapshot.rates).filter((c) => CURRENCY_LABELS[c])
  const defaultCurrency = currencyKeys.includes('USD') ? 'USD' : currencyKeys[0] ?? 'USD'

  const [currency, setCurrency] = useState(defaultCurrency)
  const [unitForeign, setUnitForeign] = useState('')
  const [qty, setQty] = useState('1')
  const [salePriceKrw, setSalePriceKrw] = useState('')
  const [shippingKrw, setShippingKrw] = useState('6000')
  const [marketKey, setMarketKey] = useState('coupang')
  const [customFee, setCustomFee] = useState('')
  const [otherKrw, setOtherKrw] = useState('')

  const feePct = useMemo(() => {
    if (marketKey === 'custom') return Number(customFee) || 0
    return MARKET_FEE_PRESETS.find((m) => m.value === marketKey)?.fee ?? 0
  }, [marketKey, customFee])

  const result = useMemo(() => {
    const rateInfo = snapshot.rates[currency]
    const q = Number(qty) || 0
    const foreign = Number(unitForeign) || 0
    const sale = Number(salePriceKrw) || 0
    const shipping = Number(shippingKrw) || 0
    const other = Number(otherKrw) || 0
    const f = Math.max(0, feePct) / 100

    if (!rateInfo || q <= 0) return null

    const krwPerUnit = (foreign * rateInfo.rate) / (rateInfo.unit || 1)
    const costPurchase = krwPerUnit * q
    const saleTotal = sale * q
    const marketFee = saleTotal * f
    const fixedCost = costPurchase + shipping + other // 수수료 제외 비용
    const totalCost = fixedCost + marketFee
    const margin = saleTotal - totalCost
    const marginPct = saleTotal > 0 ? (margin / saleTotal) * 100 : null
    // 손익분기 판매 단가: S(1-f) = fixedCost → S = fixedCost/(1-f), per unit ÷ q
    const breakevenUnit = f < 1 && q > 0 ? fixedCost / (1 - f) / q : null

    return {
      krwPerUnit,
      costPurchase,
      saleTotal,
      marketFee,
      totalCost,
      margin,
      marginPct,
      breakevenUnit,
      hasSale: sale > 0,
    }
  }, [snapshot, currency, qty, unitForeign, salePriceKrw, shippingKrw, otherKrw, feePct])

  const rateInfo = snapshot.rates[currency]
  const rateLabel = rateInfo
    ? `1${currency === 'JPY' ? '00' : ''}${currency} ≈ ₩${rateInfo.rate.toLocaleString('ko-KR')}`
    : null

  const tone =
    result?.marginPct == null
      ? 'neutral'
      : result.margin < 0
        ? 'loss'
        : result.marginPct < LOW_MARGIN_PCT
          ? 'warn'
          : 'good'

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      {/* 입력 */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">입력</h2>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-slate-600 mb-1">통화</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              aria-label="매입 통화"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {currencyKeys.map((c) => (
                <option key={c} value={c}>
                  {CURRENCY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <NumberField
            label="매입 단가 (외화)"
            value={unitForeign}
            onChange={setUnitForeign}
            step="0.01"
            placeholder="0.00"
            suffix={currency}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField label="수량" value={qty} onChange={setQty} step="1" min="1" placeholder="1" suffix="개" />
          <NumberField
            label="판매 단가 (KRW)"
            value={salePriceKrw}
            onChange={setSalePriceKrw}
            step="100"
            placeholder="0"
            suffix="원"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs font-medium text-slate-600 mb-1">마켓 (수수료)</span>
            <select
              value={marketKey}
              onChange={(e) => setMarketKey(e.target.value)}
              aria-label="마켓플레이스 수수료 프리셋"
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {MARKET_FEE_PRESETS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                  {m.value !== 'custom' ? ` (${m.fee}%)` : ''}
                </option>
              ))}
            </select>
          </label>
          {marketKey === 'custom' ? (
            <NumberField
              label="수수료율 직접 입력"
              value={customFee}
              onChange={setCustomFee}
              step="0.1"
              placeholder="0"
              suffix="%"
            />
          ) : (
            <div className="block">
              <span className="block text-xs font-medium text-slate-600 mb-1">적용 수수료율</span>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 tabular-nums">
                {feePct}%
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="배대지 배송비 (KRW)"
            value={shippingKrw}
            onChange={setShippingKrw}
            step="500"
            placeholder="6000"
            suffix="원"
          />
          <NumberField
            label="기타 비용 (관세·수수료 등)"
            value={otherKrw}
            onChange={setOtherKrw}
            step="500"
            placeholder="0"
            suffix="원"
          />
        </div>

        <p className="text-[11px] leading-relaxed text-slate-400">
          {rateLabel && (
            <>
              적용 환율 {rateLabel}
              {snapshot.isFallback ? ' (대체 환율)' : ''} · 한국수출입은행 기준.{' '}
            </>
          )}
          마켓 수수료율은 추정 기본값이며 카테고리·계약에 따라 다릅니다 — 직접 조정하세요.
        </p>
      </section>

      {/* 결과 */}
      <section
        className={`rounded-xl border-l-[3px] p-5 shadow-sm space-y-4 ${
          tone === 'loss'
            ? 'border border-rose-200 border-l-rose-500 bg-gradient-to-br from-rose-50 to-white'
            : tone === 'warn'
              ? 'border border-amber-200 border-l-amber-500 bg-gradient-to-br from-amber-50 to-white'
              : tone === 'good'
                ? 'border border-emerald-200 border-l-emerald-500 bg-gradient-to-br from-emerald-50 to-white'
                : 'border border-slate-200 border-l-slate-300 bg-white'
        }`}
      >
        <h2 className="text-sm font-semibold text-slate-900">결과</h2>

        {!result ? (
          <p className="py-8 text-center text-sm text-slate-400">
            매입 단가·수량을 입력하면 마진이 계산됩니다.
          </p>
        ) : (
          <>
            <div className="text-center py-2">
              <p className="text-xs font-medium text-slate-500">순마진 (전체 {Number(qty) || 0}개)</p>
              <p
                className={`mt-0.5 text-3xl font-bold tracking-tight tabular-nums ${
                  tone === 'loss'
                    ? 'text-rose-700'
                    : tone === 'warn'
                      ? 'text-amber-700'
                      : tone === 'good'
                        ? 'text-emerald-700'
                        : 'text-slate-900'
                }`}
              >
                {result.hasSale ? formatKRW(result.margin) : '—'}
              </p>
              {result.hasSale && result.marginPct != null && (
                <p
                  className={`mt-0.5 text-sm font-semibold tabular-nums ${
                    tone === 'loss'
                      ? 'text-rose-600'
                      : tone === 'warn'
                        ? 'text-amber-600'
                        : tone === 'good'
                          ? 'text-emerald-600'
                          : 'text-slate-500'
                  }`}
                >
                  마진율 {result.marginPct.toFixed(1)}%
                  {tone === 'loss' && ' · 역마진'}
                  {tone === 'warn' && ' · 마진 주의'}
                </p>
              )}
            </div>

            <dl className="space-y-1.5 text-sm border-t border-slate-200/70 pt-3">
              <Row label="매입 환산 (단가)" value={formatKRW(result.krwPerUnit)} />
              <Row label="매입 합계" value={formatKRW(result.costPurchase)} />
              {result.hasSale && <Row label="판매 합계" value={formatKRW(result.saleTotal)} />}
              <Row label={`마켓 수수료 (${feePct}%)`} value={result.hasSale ? '−' + formatKRW(result.marketFee) : '—'} />
              <Row label="배송비 + 기타" value={'−' + formatKRW((Number(shippingKrw) || 0) + (Number(otherKrw) || 0))} />
              <Row label="총 비용" value={formatKRW(result.totalCost)} strong />
              {result.breakevenUnit != null && (
                <Row
                  label="손익분기 판매 단가"
                  value={formatKRW(result.breakevenUnit)}
                  hint="이 단가 이상이어야 이익"
                />
              )}
            </dl>

            <Link
              href="/orders/new"
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              주문 등록하러 가기
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </>
        )}
      </section>
    </div>
  )
}

function Row({
  label,
  value,
  strong,
  hint,
}: {
  label: string
  value: string
  strong?: boolean
  hint?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-slate-500">
        {label}
        {hint && <span className="ml-1.5 text-[10px] text-slate-400">{hint}</span>}
      </dt>
      <dd className={`tabular-nums ${strong ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>{value}</dd>
    </div>
  )
}
