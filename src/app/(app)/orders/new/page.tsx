'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Currency = 'USD' | 'JPY' | 'CNY' | 'EUR' | 'KRW'

const CURRENCIES: { code: Currency; label: string }[] = [
  { code: 'USD', label: 'USD ($)' },
  { code: 'JPY', label: 'JPY (¥)' },
  { code: 'CNY', label: 'CNY (¥)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'KRW', label: 'KRW (₩)' },
]

function suggestOrderNumber(): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 9000) + 1000)
  return `ORD-${yy}${mm}${dd}-${rand}`
}

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function NewOrderPage() {
  const router = useRouter()

  // 식별
  const [orderNumber, setOrderNumber] = useState('')
  const [orderDate, setOrderDate] = useState(todayISO())

  // 의뢰자
  const [clientName, setClientName] = useState('')

  // 상품 (MVP — 1개)
  const [productName, setProductName] = useState('')
  const [productUrl, setProductUrl] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [unitPrice, setUnitPrice] = useState('')
  const [weightKg, setWeightKg] = useState('')

  // 메모
  const [requestNotes, setRequestNotes] = useState('')

  // UI 상태
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setOrderNumber(suggestOrderNumber())
  }, [])

  const totalForeign = useMemo(() => {
    const q = Number(quantity)
    const p = Number(unitPrice)
    if (!Number.isFinite(q) || !Number.isFinite(p) || q <= 0 || p <= 0) return null
    return q * p
  }, [quantity, unitPrice])

  const canSubmit =
    orderNumber.trim().length > 0 &&
    productName.trim().length > 0 &&
    Number(quantity) > 0 &&
    !submitting

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: orderNumber.trim(),
          order_date: orderDate,
          client_display_name: clientName.trim() || null,
          request_notes: requestNotes.trim() || null,
          items: [
            {
              product_name: productName.trim(),
              product_url: productUrl.trim() || null,
              quantity: Number(quantity),
              currency,
              unit_price_foreign: Number(unitPrice) > 0 ? Number(unitPrice) : null,
              weight_kg: Number(weightKg) > 0 ? Number(weightKg) : null,
            },
          ],
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error || `주문 등록에 실패했습니다 (HTTP ${res.status})`)
      }

      router.push('/orders')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '주문 등록 중 오류가 발생했습니다.')
      setSubmitting(false)
    }
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link
          href="/orders"
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="주문 목록으로"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">새 주문 입력</h1>
          <p className="text-sm text-slate-600 mt-1">
            의뢰자 주문을 수동으로 입력합니다. 등록 후 배대지 양식으로 변환할 수 있습니다.
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-medium text-rose-700">{error}</p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        {/* 식별 정보 */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">식별 정보</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="주문번호" htmlFor="order_number" required hint="자동 생성된 번호를 그대로 사용하거나 수정할 수 있습니다.">
              <input
                id="order_number"
                type="text"
                required
                maxLength={64}
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="주문일" htmlFor="order_date" required>
              <input
                id="order_date"
                type="date"
                required
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="의뢰자 이름" htmlFor="client_name" hint="의뢰자 관리에 자동 등록됩니다. 비워두면 미지정 주문으로 저장됩니다.">
            <input
              id="client_name"
              type="text"
              maxLength={120}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="예: 김의뢰"
              className={inputCls}
            />
          </Field>
        </section>

        {/* 상품 정보 */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">상품 정보</h2>
            <span className="text-[11px] text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">MVP — 상품 1건</span>
          </div>
          <Field label="상품명" htmlFor="product_name" required>
            <input
              id="product_name"
              type="text"
              required
              maxLength={300}
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="예: Nike Air Force 1 Low '07"
              className={inputCls}
            />
          </Field>
          <Field label="상품 URL" htmlFor="product_url" hint="해외 쇼핑몰의 상품 페이지 주소">
            <input
              id="product_url"
              type="url"
              maxLength={500}
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="https://"
              className={inputCls}
            />
          </Field>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="수량" htmlFor="quantity" required>
              <input
                id="quantity"
                type="number"
                required
                min={1}
                max={9999}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="통화" htmlFor="currency">
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className={inputCls}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </Field>
            <Field label="단가" htmlFor="unit_price">
              <input
                id="unit_price"
                type="number"
                min={0}
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0.00"
                className={`${inputCls} text-right tabular-nums`}
              />
            </Field>
            <Field label="중량 (kg)" htmlFor="weight">
              <input
                id="weight"
                type="number"
                min={0}
                step="0.001"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="0.000"
                className={`${inputCls} text-right tabular-nums`}
              />
            </Field>
          </div>
          {totalForeign !== null && (
            <div className="flex items-center justify-end gap-2 text-xs text-slate-600">
              <span>합계 (외화)</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(totalForeign)} {currency}
              </span>
            </div>
          )}
        </section>

        {/* 메모 */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <Field label="요청 사항" htmlFor="request_notes" hint="의뢰자가 전달한 옵션·사이즈·색상 등을 자유롭게 기록할 수 있습니다.">
            <textarea
              id="request_notes"
              rows={4}
              maxLength={2000}
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              placeholder="예: 사이즈 270, 색상 화이트, 박스 동봉 요청"
              className={`${inputCls} resize-y`}
            />
          </Field>
        </section>

        {/* 액션 */}
        <div className="flex items-center justify-end gap-2">
          <Link
            href="/orders"
            className="px-4 py-2 text-sm font-medium rounded-md text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
          >
            {submitting ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round" />
                </svg>
                등록 중…
              </>
            ) : (
              '주문 등록'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputCls =
  'block w-full px-3 py-2 text-sm rounded-md border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors'

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-700 mb-1.5">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-500 mt-1">{hint}</p>}
    </div>
  )
}
