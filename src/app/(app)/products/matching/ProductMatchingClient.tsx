'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type DomesticProduct = {
  id: string
  seller_sku: string | null
  display_name: string
  marketplace: string | null
  sale_price_krw: number | string | null
  image_url: string | null
}
type ForeignProduct = {
  id: string
  seller_sku: string
  display_name: string
  english_name: string | null
  default_supplier_site: string | null
  default_currency: string | null
  default_unit_price: number | string | null
  image_url: string | null
}
type Mapping = {
  id: string
  domestic_product_id: string
  foreign_product_id: string
  qty_ratio: number | string
  notes: string | null
  created_at: string
}

function fmtPriceKrw(p: number | string | null): string {
  if (p == null) return '—'
  const n = typeof p === 'number' ? p : Number(p)
  if (!Number.isFinite(n)) return '—'
  return `₩${Math.round(n).toLocaleString('ko-KR')}`
}
function fmtPriceForeign(p: number | string | null, c: string | null): string {
  if (p == null) return '—'
  const n = typeof p === 'number' ? p : Number(p)
  if (!Number.isFinite(n)) return '—'
  const sym = c === 'USD' ? '$' : c === 'JPY' ? '¥' : c === 'CNY' ? '¥' : ''
  return `${sym}${n.toFixed(2)}${sym ? '' : ` ${c ?? ''}`}`
}

export function ProductMatchingClient({
  domesticProducts,
  foreignProducts,
  mappings: initialMappings,
}: {
  domesticProducts: DomesticProduct[]
  foreignProducts: ForeignProduct[]
  mappings: Mapping[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetDomestic = searchParams.get('domestic')
  const [selectedDomesticId, setSelectedDomesticId] = useState<string | null>(
    presetDomestic && domesticProducts.find((d) => d.id === presetDomestic)?.id || domesticProducts[0]?.id || null,
  )
  const [mappings, setMappings] = useState(initialMappings)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    if (presetDomestic && presetDomestic !== selectedDomesticId) {
      const exists = domesticProducts.find((d) => d.id === presetDomestic)
      // URL query 의 presetDomestic 변경 시 selection 동기화 — 외부 prop sync 패턴
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (exists) setSelectedDomesticId(presetDomestic)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetDomestic])

  const selectedDomestic = domesticProducts.find((d) => d.id === selectedDomesticId)
  const filteredDomestic = useMemo(() => {
    if (!filter.trim()) return domesticProducts
    const term = filter.trim().toLowerCase()
    return domesticProducts.filter((d) =>
      (d.display_name ?? '').toLowerCase().includes(term) ||
      (d.seller_sku ?? '').toLowerCase().includes(term),
    )
  }, [domesticProducts, filter])

  const mappingsForSelected = useMemo(() => {
    if (!selectedDomesticId) return []
    return mappings.filter((m) => m.domestic_product_id === selectedDomesticId)
  }, [mappings, selectedDomesticId])

  const mappedForeignIds = new Set(mappingsForSelected.map((m) => m.foreign_product_id))
  const availableForeign = foreignProducts.filter((f) => !mappedForeignIds.has(f.id))

  async function addMapping(foreignId: string) {
    if (!selectedDomesticId) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/product-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domestic_product_id: selectedDomesticId, foreign_product_id: foreignId }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data.error ?? '매칭 실패')
        setBusy(false)
        return
      }
      router.refresh()
      const data = (await res.json()) as { id: string }
      setMappings((prev) => [
        { id: data.id, domestic_product_id: selectedDomesticId, foreign_product_id: foreignId, qty_ratio: 1, notes: null, created_at: new Date().toISOString() },
        ...prev,
      ])
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setBusy(false)
    }
  }

  async function removeMapping(mappingId: string) {
    if (!confirm('이 매칭을 해제할까요?')) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/product-mappings/${mappingId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data.error ?? '해제 실패')
        setBusy(false)
        return
      }
      setMappings((prev) => prev.filter((m) => m.id !== mappingId))
      router.refresh()
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
      {/* 좌측: 국내 상품 선택 */}
      <div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden flex flex-col max-h-[700px]">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <p className="text-[11px] uppercase tracking-wider text-slate-600 font-semibold">국내 상품</p>
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="상품명 / SKU 검색"
            className="mt-2 w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <ul className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredDomestic.map((d) => {
            const count = mappings.filter((m) => m.domestic_product_id === d.id).length
            const active = d.id === selectedDomesticId
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => setSelectedDomesticId(d.id)}
                  className={`w-full text-left px-3 py-2.5 transition-colors ${
                    active ? 'bg-indigo-50 border-l-[3px] border-l-indigo-500' : 'hover:bg-slate-50/70 border-l-[3px] border-l-transparent'
                  }`}
                >
                  <p className={`text-xs font-semibold ${active ? 'text-indigo-900' : 'text-slate-900'} truncate`}>{d.display_name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate font-mono">{d.seller_sku || '—'}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    🔗 매칭 <b className={active ? 'text-indigo-700' : 'text-slate-700'}>{count}</b>건
                  </p>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* 우측: 매칭 + 추가 */}
      <div className="space-y-4">
        {selectedDomestic && (
          <div className="rounded-lg bg-white shadow-sm border border-slate-200 border-l-[3px] border-l-emerald-500 p-5">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">선택된 국내 상품</p>
            <p className="mt-1 text-base font-bold text-slate-900">{selectedDomestic.display_name}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedDomestic.seller_sku && <span className="font-mono mr-2">{selectedDomestic.seller_sku}</span>}
              {selectedDomestic.marketplace && <span>{selectedDomestic.marketplace}</span>}
              {selectedDomestic.sale_price_krw != null && <span className="ml-2 tabular-nums">{fmtPriceKrw(selectedDomestic.sale_price_krw)}</span>}
            </p>
          </div>
        )}

        {/* 매칭된 해외 상품 */}
        <div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-wider text-slate-600 font-semibold">매칭된 해외 상품 ({mappingsForSelected.length}건)</p>
          </div>
          {mappingsForSelected.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-slate-500">
              아직 매칭된 해외 상품이 없습니다. 아래에서 추가하세요.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {mappingsForSelected.map((m) => {
                const fp = foreignProducts.find((f) => f.id === m.foreign_product_id)
                if (!fp) return null
                return (
                  <li key={m.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50/60">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{fp.display_name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        <span className="font-mono mr-2">{fp.seller_sku}</span>
                        {fp.default_supplier_site && <span className="mr-2">{fp.default_supplier_site}</span>}
                        <span className="tabular-nums">{fmtPriceForeign(fp.default_unit_price, fp.default_currency)}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMapping(m.id)}
                      disabled={busy}
                      className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 disabled:opacity-50"
                    >
                      해제
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          {error && <div className="px-4 py-2 border-t border-rose-100 bg-rose-50 text-[11px] text-rose-700">{error}</div>}
        </div>

        {/* 미매칭 해외 상품 — 추가 */}
        <div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-[11px] uppercase tracking-wider text-slate-600 font-semibold">매칭할 해외 상품 추가 ({availableForeign.length}건)</p>
          </div>
          {availableForeign.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-slate-500">
              매칭 가능한 해외 상품이 없습니다 (모두 이미 매칭됨).
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {availableForeign.map((fp) => (
                <li key={fp.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-emerald-50/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{fp.display_name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      <span className="font-mono mr-2">{fp.seller_sku}</span>
                      {fp.default_supplier_site && <span className="mr-2">{fp.default_supplier_site}</span>}
                      <span className="tabular-nums">{fmtPriceForeign(fp.default_unit_price, fp.default_currency)}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addMapping(fp.id)}
                    disabled={busy || !selectedDomesticId}
                    className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 disabled:opacity-50"
                  >
                    + 매칭
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
