'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Currency = 'USD' | 'JPY' | 'CNY' | 'EUR' | 'KRW' | 'GBP' | 'HKD'

const CURRENCIES: { code: Currency; label: string }[] = [
  { code: 'USD', label: 'USD ($)' },
  { code: 'JPY', label: 'JPY (¥)' },
  { code: 'CNY', label: 'CNY (¥)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'HKD', label: 'HKD (HK$)' },
  { code: 'KRW', label: 'KRW (₩)' },
]

const MARKETPLACES: { value: string; label: string }[] = [
  { value: 'coupang', label: '쿠팡' },
  { value: 'smartstore', label: '스마트스토어' },
  { value: 'auction', label: '옥션' },
  { value: 'gmarket', label: '지마켓' },
  { value: '11st', label: '11번가' },
  { value: 'interpark', label: '인터파크' },
  { value: 'wemakeprice', label: '위메프' },
  { value: 'tmon', label: '티몬' },
  { value: 'kakao_gift', label: '카카오 선물하기' },
  { value: 'own_mall', label: '자사몰' },
  { value: 'kakao_channel', label: '카카오 채널' },
  { value: 'instagram', label: '인스타그램' },
  { value: 'other', label: '기타' },
]

const SUPPLIER_SITES: { value: string; label: string }[] = [
  { value: 'amazon_us', label: '미국 아마존' },
  { value: 'amazon_jp', label: '일본 아마존' },
  { value: 'amazon_de', label: '독일 아마존' },
  { value: 'amazon_uk', label: '영국 아마존' },
  { value: 'amazon_ca', label: '캐나다 아마존' },
  { value: 'rakuten_jp', label: '라쿠텐' },
  { value: 'yahoo_jp', label: '야후 재팬' },
  { value: 'mercari_jp', label: '메루카리' },
  { value: 'zozotown', label: 'ZOZOTOWN' },
  { value: 'taobao', label: '타오바오' },
  { value: 'tmall', label: '티몰' },
  { value: 'aliexpress', label: '알리익스프레스' },
  { value: 'jd', label: '징동(JD)' },
  { value: 'pinduoduo', label: '핀둬둬' },
  { value: 'ebay', label: 'eBay' },
  { value: 'walmart', label: 'Walmart' },
  { value: 'target', label: 'Target' },
  { value: 'shopee', label: 'Shopee' },
  { value: 'lazada', label: 'Lazada' },
  { value: 'farfetch', label: 'Farfetch' },
  { value: 'ssense', label: 'SSENSE' },
  { value: 'matchesfashion', label: 'Matches Fashion' },
  { value: 'mytheresa', label: 'Mytheresa' },
  { value: 'other', label: '기타' },
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

  // 해외 매입 (라인 — MVP 1건)
  const [supplierSite, setSupplierSite] = useState('')
  const [supplierOrderNumber, setSupplierOrderNumber] = useState('')
  const [productName, setProductName] = useState('')
  const [productUrl, setProductUrl] = useState('')
  const [marketOption, setMarketOption] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [currency, setCurrency] = useState<Currency>('USD')
  const [unitPrice, setUnitPrice] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [salePriceKrw, setSalePriceKrw] = useState('')

  // 배대지 (v0 — 자유 텍스트 메모, 정식 forwarder_id 는 Phase D 에서 활성)
  const [forwarderCountry, setForwarderCountry] = useState('')

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

  const marginKrw = useMemo(() => {
    // 마진은 정확하려면 환율 필요. v0 에선 셀러에게 단순 "판매가 - 매입가(KRW 환산 보류)" 가
    // 의미 없으므로 sale_price_krw 만 노출하고, 마진 자동 계산은 환율 적용 후 v0.5+ 에서.
    return null
  }, [])

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
          marketplace: marketplace || null,
          market_order_number: marketOrderNumber.trim() || null,
          buyer_name: buyerName.trim() || null,
          buyer_phone: buyerPhone.trim() || null,
          buyer_postal_code: buyerPostalCode.trim() || null,
          buyer_address: buyerAddress.trim() || null,
          buyer_detail_address: buyerDetailAddress.trim() || null,
          buyer_customs_code: buyerCustomsCode.trim() || null,
          forwarder_country: forwarderCountry || null,
          request_notes: requestNotes.trim() || null,
          items: [
            {
              product_name: productName.trim(),
              product_url: productUrl.trim() || null,
              quantity: Number(quantity),
              currency,
              unit_price_foreign: Number(unitPrice) > 0 ? Number(unitPrice) : null,
              weight_kg: Number(weightKg) > 0 ? Number(weightKg) : null,
              supplier_site: supplierSite || null,
              supplier_order_number: supplierOrderNumber.trim() || null,
              sale_price_krw: Number(salePriceKrw) > 0 ? Number(salePriceKrw) : null,
              market_option: marketOption.trim() || null,
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
          description="33 배대지 양식의 수신자 칸에 자동으로 채워질 정보입니다."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="이름" htmlFor="buyer_name">
              <input id="buyer_name" type="text" maxLength={120} value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="예: 홍길동" className={inputCls} />
            </Field>
            <Field label="전화번호" htmlFor="buyer_phone">
              <input id="buyer_phone" type="tel" maxLength={40} value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="010-1234-5678" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-4">
            <Field label="우편번호" htmlFor="buyer_postal_code">
              <input id="buyer_postal_code" type="text" maxLength={16} value={buyerPostalCode} onChange={(e) => setBuyerPostalCode(e.target.value)} placeholder="06234" className={inputCls} />
            </Field>
            <Field label="기본 주소" htmlFor="buyer_address">
              <input id="buyer_address" type="text" maxLength={300} value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} placeholder="서울 강남구 테헤란로 123" className={inputCls} />
            </Field>
          </div>
          <Field label="상세 주소" htmlFor="buyer_detail_address">
            <input id="buyer_detail_address" type="text" maxLength={200} value={buyerDetailAddress} onChange={(e) => setBuyerDetailAddress(e.target.value)} placeholder="동·호수 등" className={inputCls} />
          </Field>
          <Field label="개인통관고유부호" htmlFor="buyer_customs_code" hint="P 로 시작하는 13자리. 해외직구 통관에 필수입니다.">
            <input id="buyer_customs_code" type="text" maxLength={32} value={buyerCustomsCode} onChange={(e) => setBuyerCustomsCode(e.target.value)} placeholder="P123456789012" className={`${inputCls} font-mono`} />
          </Field>
        </Section>

        {/* 3. 해외 매입 (라인 — MVP 1건) */}
        <Section
          accent="sky"
          title="③ 해외 매입 정보"
          description="어떤 해외 사이트에서 어떤 상품을 매입했는지 기록합니다."
          rightChip="MVP — 상품 1건"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="해외 사이트" htmlFor="supplier_site">
              <select id="supplier_site" value={supplierSite} onChange={(e) => setSupplierSite(e.target.value)} className={inputCls}>
                <option value="">선택하지 않음</option>
                {SUPPLIER_SITES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
            <Field label="해외 주문번호" htmlFor="supplier_order_number" hint="해외 쇼핑몰에서 받은 주문번호 (없으면 비워두세요)">
              <input id="supplier_order_number" type="text" maxLength={128} value={supplierOrderNumber} onChange={(e) => setSupplierOrderNumber(e.target.value)} placeholder="예: 113-1234567-7654321" className={inputCls} />
            </Field>
          </div>
          <Field label="상품명" htmlFor="product_name" required>
            <input id="product_name" type="text" required maxLength={300} value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="예: Nike Air Force 1 Low '07" className={inputCls} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="해외 사이트 상품 URL" htmlFor="product_url">
              <input id="product_url" type="url" maxLength={500} value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder="https://" className={inputCls} />
            </Field>
            <Field label="마켓 옵션" htmlFor="market_option" hint="구매자가 선택한 색상·사이즈 등">
              <input id="market_option" type="text" maxLength={200} value={marketOption} onChange={(e) => setMarketOption(e.target.value)} placeholder="화이트 / 270mm" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Field label="수량" htmlFor="quantity" required>
              <input id="quantity" type="number" required min={1} max={9999} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputCls} />
            </Field>
            <Field label="매입 통화" htmlFor="currency">
              <select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className={inputCls}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </Field>
            <Field label="매입 단가" htmlFor="unit_price">
              <input id="unit_price" type="number" min={0} step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0.00" className={`${inputCls} text-right tabular-nums`} />
            </Field>
            <Field label="중량 (kg)" htmlFor="weight">
              <input id="weight" type="number" min={0} step="0.001" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="0.000" className={`${inputCls} text-right tabular-nums`} />
            </Field>
          </div>
          <Field label="마켓 판매가 (KRW)" htmlFor="sale_price_krw" hint="구매자에게 받은 금액 — 마진 계산용. 비워두면 마진 표시 안 됨.">
            <input id="sale_price_krw" type="number" min={0} step={100} value={salePriceKrw} onChange={(e) => setSalePriceKrw(e.target.value)} placeholder="0" className={`${inputCls} text-right tabular-nums`} />
          </Field>
          {totalForeign !== null && (
            <div className="flex items-center justify-end gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <span>매입 합계 (외화)</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(totalForeign)} {currency}
              </span>
              {marginKrw != null && (
                <>
                  <span className="text-slate-300 mx-2">·</span>
                  <span>예상 마진</span>
                  <span className="font-semibold text-emerald-700 tabular-nums">
                    {new Intl.NumberFormat('ko-KR').format(marginKrw)}원
                  </span>
                </>
              )}
            </div>
          )}
        </Section>

        {/* 4. 배대지 + 메모 */}
        <Section
          accent="amber"
          title="④ 배대지 & 메모"
          description="해외 매입을 어느 배대지로 받을지 + 운영 메모"
        >
          <Field
            label="배대지 국가"
            htmlFor="forwarder_country"
            hint={'Phase D 에서 33 배대지 dropdown 으로 활성 예정. 지금은 국가 코드만 기록.'}
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
