'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CURRENCIES, MARKETPLACES, SUPPLIER_SITES, SUPPLIER_COUNTRIES } from '@/lib/b2b/order-options'

export type ForwarderOption = { id: string; name: string }

export type MarketLink = {
  id?: string
  marketplace: string
  market_product_id: string
  market_option: string
  sale_price_krw: string
  notes: string
}

export type SupplierLink = {
  id?: string
  supplier_site: string
  supplier_product_url: string
  supplier_unit_price: string
  supplier_currency: string
  is_primary: boolean
  notes: string
}

export type ProductFormInitial = {
  id?: string
  seller_sku?: string
  display_name?: string
  english_name?: string
  category?: string
  default_supplier_site?: string
  default_currency?: string
  default_unit_price?: string
  default_forwarder_id?: string
  default_forwarder_country?: string
  default_weight_kg?: string
  image_url?: string
  notes?: string
  market_links?: MarketLink[]
  supplier_links?: SupplierLink[]
}

type Props = {
  mode: 'create' | 'edit'
  initial?: ProductFormInitial
  forwarders: ForwarderOption[]
}

const inputCls =
  'w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'

export default function ProductForm({ mode, initial = {}, forwarders }: Props) {
  const router = useRouter()
  const [sku, setSku] = useState(initial.seller_sku ?? '')
  const [name, setName] = useState(initial.display_name ?? '')
  const [eng, setEng] = useState(initial.english_name ?? '')
  const [category, setCategory] = useState(initial.category ?? '')
  const [supSite, setSupSite] = useState(initial.default_supplier_site ?? '')
  const [cur, setCur] = useState(initial.default_currency ?? 'USD')
  const [unitPrice, setUnitPrice] = useState(initial.default_unit_price ?? '')
  const [fwd, setFwd] = useState(initial.default_forwarder_id ?? '')
  const [country, setCountry] = useState(initial.default_forwarder_country ?? '')
  const [weight, setWeight] = useState(initial.default_weight_kg ?? '')
  const [imageUrl, setImageUrl] = useState(initial.image_url ?? '')
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [marketLinks, setMarketLinks] = useState<MarketLink[]>(initial.market_links ?? [])
  const [supplierLinks, setSupplierLinks] = useState<SupplierLink[]>(initial.supplier_links ?? [])
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = useMemo(
    () => sku.trim().length > 0 && name.trim().length > 0 && !submitting,
    [sku, name, submitting],
  )

  function addMarketLink() {
    setMarketLinks((p) => [
      ...p,
      { marketplace: '', market_product_id: '', market_option: '', sale_price_krw: '', notes: '' },
    ])
  }
  function patchMarket(i: number, patch: Partial<MarketLink>) {
    setMarketLinks((p) => p.map((m, idx) => (idx === i ? { ...m, ...patch } : m)))
  }
  function removeMarket(i: number) {
    setMarketLinks((p) => p.filter((_, idx) => idx !== i))
  }

  function addSupplier() {
    setSupplierLinks((p) => [
      ...p,
      {
        supplier_site: '',
        supplier_product_url: '',
        supplier_unit_price: '',
        supplier_currency: 'USD',
        is_primary: p.length === 0,
        notes: '',
      },
    ])
  }
  function patchSupplier(i: number, patch: Partial<SupplierLink>) {
    setSupplierLinks((p) =>
      p.map((s, idx) => {
        if (idx !== i) return patch.is_primary ? { ...s, is_primary: false } : s
        return { ...s, ...patch }
      }),
    )
  }
  function removeSupplier(i: number) {
    setSupplierLinks((p) => p.filter((_, idx) => idx !== i))
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const body = {
        seller_sku: sku.trim(),
        display_name: name.trim(),
        english_name: eng.trim() || null,
        category: category.trim() || null,
        default_supplier_site: supSite || null,
        default_currency: cur || null,
        default_unit_price: Number(unitPrice) > 0 ? Number(unitPrice) : null,
        default_forwarder_id: fwd || null,
        default_forwarder_country: country || null,
        default_weight_kg: Number(weight) > 0 ? Number(weight) : null,
        image_url: imageUrl.trim() || null,
        notes: notes.trim() || null,
        market_links: marketLinks
          .filter((m) => m.marketplace && m.market_product_id.trim())
          .map((m) => ({
            marketplace: m.marketplace,
            market_product_id: m.market_product_id.trim(),
            market_option: m.market_option.trim() || null,
            sale_price_krw: Number(m.sale_price_krw) > 0 ? Number(m.sale_price_krw) : null,
            notes: m.notes.trim() || null,
          })),
        supplier_links: supplierLinks
          .filter((s) => s.supplier_site)
          .map((s) => ({
            supplier_site: s.supplier_site,
            supplier_product_url: s.supplier_product_url.trim() || null,
            supplier_unit_price: Number(s.supplier_unit_price) > 0 ? Number(s.supplier_unit_price) : null,
            supplier_currency: s.supplier_currency || null,
            is_primary: !!s.is_primary,
            notes: s.notes.trim() || null,
          })),
      }
      const url = mode === 'create' ? '/api/products' : `/api/products/${initial.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error ?? `저장 실패 (${r.status})`)
      }
      const j = await r.json().catch(() => ({}))
      const id = (j.id as string) ?? initial.id
      router.push(id ? `/products/${id}` : '/products')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류')
    } finally {
      setSubmitting(false)
    }
  }

  async function onDelete() {
    if (mode !== 'edit' || !initial.id) return
    if (!confirm('이 SKU 를 비활성화할까요? 사용 중인 주문은 영향이 없습니다.')) return
    setDeleting(true)
    try {
      const r = await fetch(`/api/products/${initial.id}`, { method: 'DELETE' })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error ?? '삭제 실패')
      }
      router.push('/products')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제 실패')
      setDeleting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* 기본 */}
      <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-indigo-500 bg-gradient-to-br from-indigo-50/30 to-white shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">기본 정보</h2>
        <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-4">
          <div>
            <label htmlFor="sku" className="block text-xs font-medium text-slate-700 mb-1">
              SKU 코드 <span className="text-rose-600">*</span>
            </label>
            <input
              id="sku" type="text" required maxLength={120}
              value={sku} onChange={(e) => setSku(e.target.value)}
              placeholder="ANK-PWR-20K-BK" className={`${inputCls} font-mono`}
              disabled={mode === 'edit'}
            />
            {mode === 'edit' && <p className="text-[10px] text-slate-500 mt-1">SKU 코드는 수정 불가</p>}
          </div>
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-slate-700 mb-1">
              상품명 <span className="text-rose-600">*</span>
            </label>
            <input id="name" type="text" required maxLength={300} value={name} onChange={(e) => setName(e.target.value)} placeholder="Anker PowerCore 20000mAh" className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="eng" className="block text-xs font-medium text-slate-700 mb-1">영문상품명 (양식 변환용)</label>
            <input id="eng" type="text" maxLength={300} value={eng} onChange={(e) => setEng(e.target.value)} placeholder="Anker PowerCore 20000mAh" className={inputCls} />
          </div>
          <div>
            <label htmlFor="category" className="block text-xs font-medium text-slate-700 mb-1">분류</label>
            <input id="category" type="text" maxLength={80} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="전자/생활/...자유 입력" className={inputCls} />
          </div>
        </div>
      </section>

      {/* 기본값 */}
      <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-sky-500 bg-white shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">기본값 (주문 시 자동 채움)</h2>
          <p className="text-xs text-slate-500 mt-0.5">이 상품을 주문에 추가하면 이 값들이 미리 채워집니다.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="supSite" className="block text-xs font-medium text-slate-700 mb-1">기본 매입처</label>
            <select id="supSite" value={supSite} onChange={(e) => setSupSite(e.target.value)} className={inputCls}>
              <option value="">(선택 안 함)</option>
              {SUPPLIER_SITES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="cur" className="block text-xs font-medium text-slate-700 mb-1">통화</label>
            <select id="cur" value={cur} onChange={(e) => setCur(e.target.value)} className={inputCls}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="unitPrice" className="block text-xs font-medium text-slate-700 mb-1">기본 단가</label>
            <input id="unitPrice" type="number" min={0} step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0.00" className={`${inputCls} text-right tabular-nums`} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="fwd" className="block text-xs font-medium text-slate-700 mb-1">기본 배대지</label>
            <select id="fwd" value={fwd} onChange={(e) => setFwd(e.target.value)} className={inputCls}>
              <option value="">(선택 안 함)</option>
              {forwarders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="country" className="block text-xs font-medium text-slate-700 mb-1">배대지 국가</label>
            <select id="country" value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls}>
              <option value="">(선택 안 함)</option>
              {SUPPLIER_COUNTRIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="weight" className="block text-xs font-medium text-slate-700 mb-1">중량 (kg)</label>
            <input id="weight" type="number" min={0} step="0.001" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0.000" className={`${inputCls} text-right tabular-nums`} />
          </div>
        </div>
      </section>

      {/* 마켓 매핑 */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">마켓 매핑 <span className="text-slate-500 font-normal">({marketLinks.length})</span></h2>
            <p className="text-xs text-slate-500 mt-0.5">같은 SKU 가 여러 마켓에 등록된 경우 마켓 상품번호를 연결합니다.</p>
          </div>
          <button type="button" onClick={addMarketLink} className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 px-3 py-1.5 rounded border border-indigo-200 bg-indigo-50 hover:bg-indigo-100">
            + 마켓 추가
          </button>
        </div>
        {marketLinks.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">매핑할 마켓이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {marketLinks.map((m, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-start border border-slate-100 rounded-md p-2">
                <div className="col-span-3">
                  <select value={m.marketplace} onChange={(e) => patchMarket(i, { marketplace: e.target.value })} className={`${inputCls} text-xs`}>
                    <option value="">마켓</option>
                    {MARKETPLACES.map((mp) => <option key={mp.value} value={mp.value}>{mp.label}</option>)}
                  </select>
                </div>
                <div className="col-span-3">
                  <input type="text" placeholder="마켓 상품번호" value={m.market_product_id} onChange={(e) => patchMarket(i, { market_product_id: e.target.value })} className={`${inputCls} text-xs font-mono`} />
                </div>
                <div className="col-span-3">
                  <input type="text" placeholder="옵션 (블랙/270mm)" value={m.market_option} onChange={(e) => patchMarket(i, { market_option: e.target.value })} className={`${inputCls} text-xs`} />
                </div>
                <div className="col-span-2">
                  <input type="number" min={0} step={100} placeholder="판매가 KRW" value={m.sale_price_krw} onChange={(e) => patchMarket(i, { sale_price_krw: e.target.value })} className={`${inputCls} text-xs text-right tabular-nums`} />
                </div>
                <button type="button" onClick={() => removeMarket(i)} aria-label="제거" className="col-span-1 self-center text-slate-400 hover:text-rose-700 text-xs">×</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 매입처 매핑 */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">매입처 매핑 <span className="text-slate-500 font-normal">({supplierLinks.length})</span></h2>
            <p className="text-xs text-slate-500 mt-0.5">여러 해외 사이트에서 매입할 수 있는 경우 가격 비교용으로 추가합니다.</p>
          </div>
          <button type="button" onClick={addSupplier} className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 px-3 py-1.5 rounded border border-indigo-200 bg-indigo-50 hover:bg-indigo-100">
            + 매입처 추가
          </button>
        </div>
        {supplierLinks.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">추가된 매입처가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {supplierLinks.map((s, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-start border border-slate-100 rounded-md p-2">
                <div className="col-span-3">
                  <select value={s.supplier_site} onChange={(e) => patchSupplier(i, { supplier_site: e.target.value })} className={`${inputCls} text-xs`}>
                    <option value="">매입처</option>
                    {SUPPLIER_SITES.map((ss) => <option key={ss.value} value={ss.value}>{ss.label}</option>)}
                  </select>
                </div>
                <div className="col-span-4">
                  <input type="url" placeholder="상품 URL" value={s.supplier_product_url} onChange={(e) => patchSupplier(i, { supplier_product_url: e.target.value })} className={`${inputCls} text-xs`} />
                </div>
                <div className="col-span-2">
                  <input type="number" min={0} step="0.01" placeholder="단가" value={s.supplier_unit_price} onChange={(e) => patchSupplier(i, { supplier_unit_price: e.target.value })} className={`${inputCls} text-xs text-right tabular-nums`} />
                </div>
                <div className="col-span-1">
                  <select value={s.supplier_currency} onChange={(e) => patchSupplier(i, { supplier_currency: e.target.value })} className={`${inputCls} text-xs`}>
                    {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
                  </select>
                </div>
                <label className="col-span-1 flex items-center justify-center gap-1 text-[10px] text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={s.is_primary} onChange={(e) => patchSupplier(i, { is_primary: e.target.checked })} className="rounded border-slate-300" />
                  기본
                </label>
                <button type="button" onClick={() => removeSupplier(i)} aria-label="제거" className="col-span-1 self-center text-slate-400 hover:text-rose-700 text-xs">×</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 메모 + 이미지 */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">메타</h2>
        <div>
          <label htmlFor="imageUrl" className="block text-xs font-medium text-slate-700 mb-1">이미지 URL</label>
          <input id="imageUrl" type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className={inputCls} />
        </div>
        <div>
          <label htmlFor="notes" className="block text-xs font-medium text-slate-700 mb-1">메모</label>
          <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="포장 주의 / 알레르기 등 자유 메모" className={inputCls} />
        </div>
      </section>

      {error && (
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {mode === 'edit' ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={submitting || deleting}
            className="text-xs font-medium text-rose-700 hover:text-rose-800 px-3 py-1.5 rounded hover:bg-rose-50 disabled:opacity-50"
          >
            {deleting ? '비활성화 중…' : '비활성화'}
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/products')}
            disabled={submitting}
            className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {submitting ? '저장 중…' : mode === 'create' ? 'SKU 등록' : '저장'}
          </button>
        </div>
      </div>
    </form>
  )
}
