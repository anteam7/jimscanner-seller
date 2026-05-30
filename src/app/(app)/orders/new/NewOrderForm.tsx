'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CURRENCIES,
  MARKETPLACES,
  SUPPLIER_SITES,
  type Currency,
} from '@/lib/b2b/order-options'
import ProductPicker, { type PickedProduct } from '@/components/b2b/ProductPicker'
import SKUQuickPick from '@/components/b2b/SKUQuickPick'
import { CustomsGuidePanel } from '@/components/b2b/CustomsGuidePanel'
import { CustomsCategoryHint } from '@/components/b2b/CustomsCategoryHint'
import { matchCustomsCategory } from '@/lib/b2b/customs-guide'

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

export type ForwarderOption = {
  id: string
  name: string
  slug: string
}

export default function NewOrderForm({
  forwarders,
  lossSkus = {},
}: {
  forwarders: ForwarderOption[]
  /** product_id → 단위당 손실 KRW (최근 30일 마진 손실 SKU). 주문 입력 시 경고. */
  lossSkus?: Record<string, number>
}) {
  const router = useRouter()

  // 식별
  const [orderNumber, setOrderNumber] = useState('')
  const [orderDate, setOrderDate] = useState(todayISO())

  // 마켓
  const [marketplace, setMarketplace] = useState('')
  const [marketOrderNumber, setMarketOrderNumber] = useState('')

  // 마켓 구매자 (배대지 양식의 수신자)
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [buyerPostalCode, setBuyerPostalCode] = useState('')
  const [buyerAddress, setBuyerAddress] = useState('')
  const [buyerDetailAddress, setBuyerDetailAddress] = useState('')
  const [buyerCustomsCode, setBuyerCustomsCode] = useState('')

  // 해외 매입 (라인 — N건)
  type LineItem = {
    productId: string | null
    productSku: string | null
    supplierSite: string
    supplierOrderNumber: string
    productName: string
    productUrl: string
    marketOption: string
    quantity: string
    currency: Currency
    unitPrice: string
    weightKg: string
    salePriceKrw: string
    imageUrl: string
    trackingNumberOverseas: string
    forwarderId: string  // 라인별 배대지 (선택). 빈값이면 주문 forwarder 사용.
    customsCategory: string  // 통관 분류. 빈값이면 상품명에서 자동 인식.
  }
  function blankLine(): LineItem {
    return {
      productId: null,
      productSku: null,
      supplierSite: '',
      supplierOrderNumber: '',
      productName: '',
      productUrl: '',
      marketOption: '',
      quantity: '1',
      currency: 'USD',
      unitPrice: '',
      weightKg: '',
      salePriceKrw: '',
      imageUrl: '',
      trackingNumberOverseas: '',
      forwarderId: '',
      customsCategory: '',
    }
  }
  const [lines, setLines] = useState<LineItem[]>([blankLine()])
  function patchLine(i: number, p: Partial<LineItem>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...p } : l)))
  }
  function addLine() {
    setLines((p) => [...p, blankLine()])
  }
  function removeLine(i: number) {
    setLines((p) => (p.length <= 1 ? p : p.filter((_, idx) => idx !== i)))
  }

  // 배대지
  const [forwarderId, setForwarderId] = useState('')
  const [forwarderCountry, setForwarderCountry] = useState('')

  // 메모
  const [requestNotes, setRequestNotes] = useState('')

  // UI 상태
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 환율 (마진 자동 계산용) — 마운트 시 1회 fetch
  type RatesMap = Record<string, { rate: number; unit: number }>
  const [rates, setRates] = useState<RatesMap | null>(null)
  useEffect(() => {
    // 폼 mount 시 1회 주문번호 자동 제안 (YYYYMMDD-HHMM-NNN 형식) — 사용자 수정 가능
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOrderNumber(suggestOrderNumber())
    fetch('/api/exchange-rate')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j?.rates) return
        const m: RatesMap = {}
        for (const [k, v] of Object.entries(j.rates) as [string, { rate: number; unit: number }][]) {
          m[k] = { rate: v.rate, unit: v.unit }
        }
        setRates(m)
      })
      .catch(() => {/* fallback: 마진 비활성 */})
  }, [])

  // 라인별 KRW 환산 + 모든 라인 합계
  const purchaseKrwTotal = useMemo(() => {
    let sum = 0
    let any = false
    for (const l of lines) {
      const q = Number(l.quantity)
      const p = Number(l.unitPrice)
      if (!Number.isFinite(q) || !Number.isFinite(p) || q <= 0 || p <= 0) continue
      const totalF = q * p
      let krw: number
      if (l.currency === 'KRW') {
        krw = totalF
      } else {
        const r = rates?.[l.currency]
        if (!r) continue
        krw = Math.round((totalF * r.rate) / (r.unit || 1))
      }
      sum += krw
      any = true
    }
    return any ? sum : null
  }, [lines, rates])

  const saleKrwTotal = useMemo(() => {
    let sum = 0
    let any = false
    for (const l of lines) {
      const n = Number(l.salePriceKrw)
      if (!Number.isFinite(n) || n <= 0) continue
      sum += n
      any = true
    }
    return any ? sum : null
  }, [lines])

  const marginKrw = useMemo(() => {
    if (saleKrwTotal == null || purchaseKrwTotal == null) return null
    return saleKrwTotal - purchaseKrwTotal
  }, [saleKrwTotal, purchaseKrwTotal])

  const marginRate = useMemo(() => {
    if (marginKrw == null || saleKrwTotal == null || saleKrwTotal <= 0) return null
    return (marginKrw / saleKrwTotal) * 100
  }, [marginKrw, saleKrwTotal])

  /** 마진율 < 5% (음수 포함) 일 때 경고 표시 */
  const marginWarning = marginRate != null && marginRate < 5

  // 검증
  const customsValid =
    !buyerCustomsCode.trim() || /^P\d{12}$/i.test(buyerCustomsCode.trim())
  const postalValid =
    !buyerPostalCode.trim() || /^\d{5}$/.test(buyerPostalCode.trim())

  function onPickProduct(i: number, p: PickedProduct) {
    const patch: Partial<LineItem> = {
      productId: p.id,
      productSku: p.seller_sku,
      productName: p.display_name,
    }
    if (p.default_supplier_site) patch.supplierSite = p.default_supplier_site
    if (p.default_currency) patch.currency = p.default_currency as Currency
    if (p.default_unit_price != null && String(p.default_unit_price).length > 0) {
      patch.unitPrice = String(p.default_unit_price)
    }
    if (p.default_weight_kg != null && String(p.default_weight_kg).length > 0) {
      patch.weightKg = String(p.default_weight_kg)
    }
    patchLine(i, patch)
    // 배대지 default 는 주문 단위 — 라인 0 일 때만 적용
    if (i === 0) {
      if (p.default_forwarder_id) setForwarderId(p.default_forwarder_id)
      if (p.default_forwarder_country) setForwarderCountry(p.default_forwarder_country)
    }
  }
  function onClearProduct(i: number) {
    patchLine(i, { productId: null, productSku: null })
  }

  /** 즐겨찾기·최근 SKU 칩 클릭 → 빈 라인 또는 새 라인에 적용 */
  function onQuickPick(p: PickedProduct) {
    setLines((prev) => {
      // 빈 라인 (productName 비어있고 productId 없음) 찾기
      const blankIdx = prev.findIndex(
        (l) => !l.productId && l.productName.trim().length === 0,
      )
      const targetIdx = blankIdx >= 0 ? blankIdx : prev.length
      const base = blankIdx >= 0 ? prev[targetIdx] : blankLine()
      const patched: LineItem = {
        ...base,
        productId: p.id,
        productSku: p.seller_sku,
        productName: p.display_name,
        supplierSite: p.default_supplier_site ?? base.supplierSite,
        currency: (p.default_currency as Currency) || base.currency,
        unitPrice:
          p.default_unit_price != null && String(p.default_unit_price).length > 0
            ? String(p.default_unit_price)
            : base.unitPrice,
        weightKg:
          p.default_weight_kg != null && String(p.default_weight_kg).length > 0
            ? String(p.default_weight_kg)
            : base.weightKg,
      }
      if (blankIdx >= 0) {
        return prev.map((l, idx) => (idx === targetIdx ? patched : l))
      }
      return [...prev, patched]
    })
    // 첫 라인일 때 주문 단위 배대지 default 적용
    if (lines.length === 1 && !lines[0].productId && !lines[0].productName.trim()) {
      if (p.default_forwarder_id) setForwarderId(p.default_forwarder_id)
      if (p.default_forwarder_country) setForwarderCountry(p.default_forwarder_country)
    }
  }

  const allLinesValid = lines.every(
    (l) => l.productName.trim().length > 0 && Number(l.quantity) > 0,
  )
  const canSubmit =
    orderNumber.trim().length > 0 &&
    allLinesValid &&
    customsValid &&
    postalValid &&
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
          marketplace: marketplace || null,
          market_order_number: marketOrderNumber.trim() || null,
          buyer_name: buyerName.trim() || null,
          buyer_phone: buyerPhone.trim() || null,
          buyer_postal_code: buyerPostalCode.trim() || null,
          buyer_address: buyerAddress.trim() || null,
          buyer_detail_address: buyerDetailAddress.trim() || null,
          buyer_customs_code: buyerCustomsCode.trim() || null,
          forwarder_id: forwarderId || null,
          forwarder_country: forwarderCountry || null,
          request_notes: requestNotes.trim() || null,
          items: lines.map((l) => ({
            product_id: l.productId,
            product_name: l.productName.trim(),
            product_url: l.productUrl.trim() || null,
            quantity: Number(l.quantity),
            currency: l.currency,
            unit_price_foreign: Number(l.unitPrice) > 0 ? Number(l.unitPrice) : null,
            weight_kg: Number(l.weightKg) > 0 ? Number(l.weightKg) : null,
            supplier_site: l.supplierSite || null,
            supplier_order_number: l.supplierOrderNumber.trim() || null,
            sale_price_krw: Number(l.salePriceKrw) > 0 ? Number(l.salePriceKrw) : null,
            market_option: l.marketOption.trim() || null,
            image_url: l.imageUrl.trim() || null,
            tracking_number_overseas: l.trackingNumberOverseas.trim() || null,
            forwarder_id: l.forwarderId || null,
            customs_category:
              l.customsCategory || matchCustomsCategory(l.productName)?.category || null,
          })),
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
            마켓 주문 → 해외 매입 → 배대지 → 마켓 구매자에게 배송. 한번에 등록합니다.
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-medium text-rose-700">{error}</p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        {/* 1. 마켓 정보 */}
        <Section
          accent="indigo"
          title="① 마켓 주문 정보"
          description="국내 오픈마켓에서 받은 주문의 출처를 기록합니다."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="셀러 내부 주문번호" htmlFor="order_number" required hint="자동 생성된 번호를 그대로 사용하거나 수정할 수 있습니다.">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="판매 마켓" htmlFor="marketplace">
              <select
                id="marketplace"
                value={marketplace}
                onChange={(e) => setMarketplace(e.target.value)}
                className={inputCls}
              >
                <option value="">선택하지 않음</option>
                {MARKETPLACES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Field>
            <Field label="마켓 주문번호" htmlFor="market_order_number" hint="쿠팡·스마트스토어 등에서 받은 주문번호 (양식 변환 시 필요)">
              <input
                id="market_order_number"
                type="text"
                maxLength={128}
                value={marketOrderNumber}
                onChange={(e) => setMarketOrderNumber(e.target.value)}
                placeholder="예: 2026051512345678"
                className={inputCls}
              />
            </Field>
          </div>
        </Section>

        {/* 2. 마켓 구매자 (수신자) */}
        <Section
          accent="emerald"
          title="② 마켓 구매자 (배송 수신자)"
          description="33 배대지 양식 수신자 칸에 자동으로 채워집니다. ★ 표시는 양식 변환에 필요한 항목."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="이름" htmlFor="buyer_name" required>
              <input id="buyer_name" type="text" maxLength={120} value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="예: 홍길동" className={inputCls} />
            </Field>
            <Field label="전화번호" htmlFor="buyer_phone" required>
              <input id="buyer_phone" type="tel" maxLength={40} value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="010-1234-5678" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-4">
            <Field label="우편번호" htmlFor="buyer_postal_code" required>
              <input
                id="buyer_postal_code"
                type="text"
                inputMode="numeric"
                maxLength={5}
                value={buyerPostalCode}
                onChange={(e) => setBuyerPostalCode(e.target.value.replace(/\D/g, ''))}
                placeholder="06234"
                aria-invalid={!postalValid}
                className={`${inputCls} ${!postalValid ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200' : ''}`}
              />
              {!postalValid && (
                <p className="text-[11px] text-rose-600 mt-1">우편번호는 숫자 5자리여야 합니다.</p>
              )}
            </Field>
            <Field label="기본 주소" htmlFor="buyer_address" required>
              <input id="buyer_address" type="text" maxLength={300} value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} placeholder="서울 강남구 테헤란로 123" className={inputCls} />
            </Field>
          </div>
          <Field label="상세 주소" htmlFor="buyer_detail_address">
            <input id="buyer_detail_address" type="text" maxLength={200} value={buyerDetailAddress} onChange={(e) => setBuyerDetailAddress(e.target.value)} placeholder="동·호수 등" className={inputCls} />
          </Field>
          <Field label="개인통관고유부호" htmlFor="buyer_customs_code" required hint="P 로 시작하는 13자리. 해외직구 통관에 필수입니다.">
            <input
              id="buyer_customs_code"
              type="text"
              maxLength={13}
              value={buyerCustomsCode}
              onChange={(e) => setBuyerCustomsCode(e.target.value.toUpperCase())}
              placeholder="P123456789012"
              aria-invalid={!customsValid}
              className={`${inputCls} font-mono ${!customsValid ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200' : ''}`}
            />
            {!customsValid && (
              <p className="text-[11px] text-rose-600 mt-1">P 로 시작하는 영문 1자 + 숫자 12자리여야 합니다 (예: P123456789012).</p>
            )}
          </Field>
        </Section>

        {/* 3. 해외 매입 (N 라인) */}
        <Section
          accent="sky"
          title="③ 해외 매입 정보"
          description="한 마켓 주문에 N개 상품을 매입한 경우 라인을 추가합니다."
          rightChip={`${lines.length} 라인`}
        >
          <SKUQuickPick onPick={onQuickPick} lossSkus={lossSkus} />
          <CustomsGuidePanel />
          {lines.map((line, i) => (
            <div
              key={i}
              className={`space-y-4 ${i > 0 ? 'pt-4 border-t border-slate-200' : ''}`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs font-semibold text-slate-700">
                  라인 {i + 1}
                </p>
                <div className="flex items-center gap-2">
                  <ProductPicker
                    selectedId={line.productId}
                    selectedLabel={line.productSku}
                    onPick={(p) => onPickProduct(i, p)}
                    onClear={() => onClearProduct(i)}
                    lossSkus={lossSkus}
                  />
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      className="text-xs text-slate-500 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50"
                      aria-label={`라인 ${i + 1} 제거`}
                    >
                      ✕ 라인 제거
                    </button>
                  )}
                </div>
              </div>
              {line.productId && lossSkus[line.productId] != null && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
                  ⚠ 이 SKU 는 최근 30일 평균 판매가 기준{' '}
                  <span className="font-semibold">단위당 약 {Math.round(lossSkus[line.productId]).toLocaleString('ko-KR')}원 손실</span>
                  {' '}추정입니다 (환산 매입가 + 배대지비 추정 대비). 판매가·매입 단가를 확인하세요.
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="해외 사이트" htmlFor={`supplier_site_${i}`}>
                  <select id={`supplier_site_${i}`} value={line.supplierSite} onChange={(e) => patchLine(i, { supplierSite: e.target.value })} className={inputCls}>
                    <option value="">선택하지 않음</option>
                    {SUPPLIER_SITES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="해외 주문번호" htmlFor={`supplier_order_number_${i}`} hint="해외 쇼핑몰에서 받은 주문번호 (없으면 비워두세요)">
                  <input id={`supplier_order_number_${i}`} type="text" maxLength={128} value={line.supplierOrderNumber} onChange={(e) => patchLine(i, { supplierOrderNumber: e.target.value })} placeholder="예: 113-1234567-7654321" className={inputCls} />
                </Field>
                <Field label="이 라인 배대지" htmlFor={`line_forwarder_${i}`} hint="비우면 주문 배대지 사용. 다른 배대지 이용 시 선택.">
                  <select id={`line_forwarder_${i}`} value={line.forwarderId} onChange={(e) => patchLine(i, { forwarderId: e.target.value })} className={inputCls}>
                    <option value="">주문 배대지 사용</option>
                    {forwarders.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="상품명" htmlFor={`product_name_${i}`} required>
                <input id={`product_name_${i}`} type="text" required maxLength={300} value={line.productName} onChange={(e) => patchLine(i, { productName: e.target.value })} placeholder="예: Nike Air Force 1 Low '07" className={inputCls} />
              </Field>
              <CustomsCategoryHint
                productName={line.productName}
                value={line.customsCategory}
                onChange={(v) => patchLine(i, { customsCategory: v })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="해외 사이트 상품 URL" htmlFor={`product_url_${i}`}>
                  <input id={`product_url_${i}`} type="url" maxLength={500} value={line.productUrl} onChange={(e) => patchLine(i, { productUrl: e.target.value })} placeholder="https://" className={inputCls} />
                </Field>
                <Field label="마켓 옵션" htmlFor={`market_option_${i}`} hint="구매자가 선택한 색상·사이즈 등">
                  <input id={`market_option_${i}`} type="text" maxLength={200} value={line.marketOption} onChange={(e) => patchLine(i, { marketOption: e.target.value })} placeholder="화이트 / 270mm" className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Field label="수량" htmlFor={`quantity_${i}`} required>
                  <input id={`quantity_${i}`} type="number" required min={1} max={9999} step={1} value={line.quantity} onChange={(e) => patchLine(i, { quantity: e.target.value })} className={inputCls} />
                </Field>
                <Field label="매입 통화" htmlFor={`currency_${i}`}>
                  <select id={`currency_${i}`} value={line.currency} onChange={(e) => patchLine(i, { currency: e.target.value as Currency })} className={inputCls}>
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="매입 단가" htmlFor={`unit_price_${i}`}>
                  <input id={`unit_price_${i}`} type="number" min={0} step="0.01" value={line.unitPrice} onChange={(e) => patchLine(i, { unitPrice: e.target.value })} placeholder="0.00" className={`${inputCls} text-right tabular-nums`} />
                </Field>
                <Field label="중량 (kg)" htmlFor={`weight_${i}`}>
                  <input id={`weight_${i}`} type="number" min={0} step="0.001" value={line.weightKg} onChange={(e) => patchLine(i, { weightKg: e.target.value })} placeholder="0.000" className={`${inputCls} text-right tabular-nums`} />
                </Field>
              </div>
              <Field label="마켓 판매가 (KRW)" htmlFor={`sale_price_krw_${i}`} hint="구매자에게 받은 금액 — 마진 계산용">
                <input id={`sale_price_krw_${i}`} type="number" min={0} step={100} value={line.salePriceKrw} onChange={(e) => patchLine(i, { salePriceKrw: e.target.value })} placeholder="0" className={`${inputCls} text-right tabular-nums`} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="이미지 URL" htmlFor={`image_url_${i}`} hint="배대지 양식 9컬럼 (선택)">
                  <input id={`image_url_${i}`} type="url" maxLength={500} value={line.imageUrl} onChange={(e) => patchLine(i, { imageUrl: e.target.value })} placeholder="https://" className={inputCls} />
                </Field>
                <Field label="현지 트래킹 (해외 → 배대지)" htmlFor={`tracking_overseas_${i}`} hint="배대지 양식 11컬럼 (선택)">
                  <input id={`tracking_overseas_${i}`} type="text" maxLength={128} value={line.trackingNumberOverseas} onChange={(e) => patchLine(i, { trackingNumberOverseas: e.target.value })} placeholder="1Z999AA10123456784" className={`${inputCls} font-mono text-sm`} />
                </Field>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800 rounded border border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 14 14" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 2v10M2 7h10" />
              </svg>
              라인 추가
            </button>
            {(purchaseKrwTotal != null || saleKrwTotal != null) && (
              <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap justify-end">
                {purchaseKrwTotal != null && (
                  <>
                    <span className="text-slate-500">매입 합계 KRW</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {new Intl.NumberFormat('ko-KR').format(purchaseKrwTotal)}원
                    </span>
                  </>
                )}
                {saleKrwTotal != null && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500">판매 합계</span>
                    <span className="font-semibold text-slate-800 tabular-nums">
                      {new Intl.NumberFormat('ko-KR').format(saleKrwTotal)}원
                    </span>
                  </>
                )}
                {marginKrw != null && (
                  <>
                    <span className="text-slate-300 mx-2">·</span>
                    <span>예상 마진</span>
                    <span className={`font-semibold tabular-nums ${marginKrw >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {new Intl.NumberFormat('ko-KR').format(marginKrw)}원
                    </span>
                    {marginRate != null && (
                      <span className={`text-[11px] tabular-nums ${marginKrw >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        ({marginRate.toFixed(1)}%)
                      </span>
                    )}
                  </>
                )}
                {!rates && lines.some((l) => l.currency !== 'KRW') && (
                  <span className="text-[10px] text-slate-400 italic">환율 로딩 중…</span>
                )}
              </div>
            )}
          </div>

          {/* 마진율 경고 (5% 미만 + 음수) */}
          {marginWarning && marginRate != null && (
            <div className={`mt-3 rounded-md border px-3 py-2.5 ${
              marginRate < 0
                ? 'border-rose-200 bg-rose-50'
                : 'border-amber-200 bg-amber-50'
            }`}>
              <div className="flex items-start gap-2">
                <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${marginRate < 0 ? 'text-rose-600' : 'text-amber-600'}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <div className="flex-1 text-xs">
                  <p className={`font-semibold ${marginRate < 0 ? 'text-rose-900' : 'text-amber-900'}`}>
                    {marginRate < 0
                      ? `마진이 음수입니다 (${marginRate.toFixed(1)}%)`
                      : `마진율이 낮습니다 (${marginRate.toFixed(1)}%)`}
                  </p>
                  <p className={`mt-0.5 leading-relaxed ${marginRate < 0 ? 'text-rose-800' : 'text-amber-800'}`}>
                    배대지 배송비·관세·플랫폼 수수료를 고려하면 실 마진은 더 줄어듭니다.
                    {marginRate < 0
                      ? ' 판매가나 매입가를 다시 확인하세요.'
                      : ' 판매가를 높이거나 매입처 가격을 비교하는 것을 검토하세요.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* 4. 배대지 + 메모 */}
        <Section
          accent="amber"
          title="④ 배대지 & 메모"
          description="해외 매입을 어느 배대지로 받을지 + 운영 메모"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="배대지"
              htmlFor="forwarder_id"
              hint={forwarders.length === 0 ? '등록된 배대지가 없습니다.' : '셀러가 사용 중인 배대지를 선택하세요.'}
            >
              <select
                id="forwarder_id"
                value={forwarderId}
                onChange={(e) => setForwarderId(e.target.value)}
                className={inputCls}
                disabled={forwarders.length === 0}
              >
                <option value="">선택하지 않음</option>
                {forwarders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </Field>
            <Field
              label="배대지 국가"
              htmlFor="forwarder_country"
              hint="해외 매입처 기준 국가 — 양식 변환에 사용"
            >
              <select
                id="forwarder_country"
                value={forwarderCountry}
                onChange={(e) => setForwarderCountry(e.target.value)}
                className={inputCls}
              >
                <option value="">선택하지 않음</option>
                <option value="US">미국 (US)</option>
                <option value="JP">일본 (JP)</option>
                <option value="CN">중국 (CN)</option>
                <option value="DE">독일 (DE)</option>
                <option value="UK">영국 (UK)</option>
                <option value="HK">홍콩 (HK)</option>
                <option value="OTHER">기타</option>
              </select>
            </Field>
          </div>
          <Field label="요청 사항 / 메모" htmlFor="request_notes" hint="구매자 요청 사항·배송 옵션·내부 메모 등">
            <textarea
              id="request_notes"
              rows={3}
              maxLength={2000}
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              placeholder="예: 박스 동봉 요청, 합포장 가능"
              className={`${inputCls} resize-y`}
            />
          </Field>
        </Section>

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

const ACCENT_BORDER: Record<string, string> = {
  indigo: 'border-l-indigo-500',
  emerald: 'border-l-emerald-500',
  sky: 'border-l-sky-500',
  amber: 'border-l-amber-500',
}

function Section({
  accent,
  title,
  description,
  rightChip,
  children,
}: {
  accent: 'indigo' | 'emerald' | 'sky' | 'amber'
  title: string
  description?: string
  rightChip?: string
  children: React.ReactNode
}) {
  return (
    <section className={`rounded-xl border border-slate-200 border-l-[3px] ${ACCENT_BORDER[accent]} bg-white shadow-sm p-6 space-y-4`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
        </div>
        {rightChip && (
          <span className="text-[11px] text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 flex-shrink-0">{rightChip}</span>
        )}
      </div>
      {children}
    </section>
  )
}

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
