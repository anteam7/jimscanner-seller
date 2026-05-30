'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { SUPPLIER_SITES, CURRENCIES } from '@/lib/b2b/order-options'

export type PickedProduct = {
  id: string
  seller_sku: string
  display_name: string
  english_name: string | null
  default_supplier_site: string | null
  default_currency: string | null
  default_unit_price: number | string | null
  default_forwarder_id: string | null
  default_forwarder_country: string | null
  default_weight_kg: number | string | null
  is_favorite?: boolean | null
}

type Props = {
  /** 현재 선택된 product id (있으면 chip 표시) */
  selectedId: string | null
  selectedLabel: string | null
  onPick: (p: PickedProduct) => void
  onClear: () => void
  /** product_id → 단위당 손실 KRW. 손실 SKU 결과에 경고 배지. */
  lossSkus?: Record<string, number>
}

export default function ProductPicker({ selectedId, selectedLabel, onPick, onClear, lossSkus = {} }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<PickedProduct[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // 인라인 빠른 등록
  const [quickOpen, setQuickOpen] = useState(false)
  const [qSku, setQSku] = useState('')
  const [qName, setQName] = useState('')
  const [qSupplier, setQSupplier] = useState('')
  const [qCurrency, setQCurrency] = useState('')
  const [qPrice, setQPrice] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  async function submitQuickCreate() {
    const sku = qSku.trim()
    const name = qName.trim()
    if (!sku || !name) {
      setCreateError('SKU 코드와 상품명을 입력해 주세요.')
      return
    }
    setCreating(true)
    setCreateError(null)
    const priceNum = qPrice.trim() ? Number(qPrice) : null
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_sku: sku,
          display_name: name,
          default_supplier_site: qSupplier || null,
          default_currency: qCurrency || null,
          default_unit_price: priceNum != null && Number.isFinite(priceNum) && priceNum > 0 ? priceNum : null,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string }
      if (!res.ok || !json.id) {
        setCreateError(json.error ?? '등록 실패')
        return
      }
      // 생성된 SKU 를 즉시 선택
      onPick({
        id: json.id,
        seller_sku: sku,
        display_name: name,
        english_name: null,
        default_supplier_site: qSupplier || null,
        default_currency: qCurrency || null,
        default_unit_price: priceNum != null && Number.isFinite(priceNum) && priceNum > 0 ? priceNum : null,
        default_forwarder_id: null,
        default_forwarder_country: null,
        default_weight_kg: null,
        is_favorite: false,
      })
      // 초기화 + 닫기
      setQSku(''); setQName(''); setQSupplier(''); setQCurrency(''); setQPrice('')
      setQuickOpen(false)
      setOpen(false)
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : '네트워크 오류')
    } finally {
      setCreating(false)
    }
  }

  const fetchResults = useCallback(async (query: string) => {
    setLoading(true)
    try {
      const url = query.trim()
        ? `/api/products?q=${encodeURIComponent(query.trim())}`
        : '/api/products'
      const r = await fetch(url)
      if (!r.ok) {
        setResults([])
        return
      }
      const j = (await r.json()) as { products: PickedProduct[] }
      // 즐겨찾기 SKU 를 상단으로 (검색 순서는 유지, 즐겨찾기만 안정 정렬로 올림)
      const list = j.products ?? []
      const sorted = [...list].sort(
        (a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0),
      )
      setResults(sorted)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      void fetchResults(q)
    }, 200)
    return () => clearTimeout(t)
  }, [q, open, fetchResults])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  function openPanel() {
    setOpen(true)
    setQ('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  if (selectedId) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-800">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          SKU 연결됨: <span className="font-mono">{selectedLabel}</span>
        </span>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-slate-500 hover:text-rose-700 underline underline-offset-2"
        >
          연결 해제
        </button>
      </div>
    )
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={openPanel}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800 px-2.5 py-1 rounded border border-indigo-200 bg-white hover:bg-indigo-50"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        등록된 SKU 에서 불러오기
      </button>
      {open && (
        <div className="absolute z-30 top-full mt-1 left-0 w-96 max-w-[calc(100vw-2rem)] rounded-md border border-slate-200 bg-white shadow-xl">
          <div className="p-2 border-b border-slate-100">
            <input
              ref={inputRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="등록된 SKU 검색 (SKU 코드 또는 상품명)"
              placeholder="SKU 코드 / 상품명 검색"
              className="w-full px-2.5 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {loading ? (
              <p className="text-xs text-slate-400 text-center py-4">검색 중…</p>
            ) : results.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-slate-500">
                  {q ? '검색 결과가 없습니다.' : '등록된 SKU 가 없습니다.'}
                </p>
                <a
                  href="/products/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-xs font-semibold text-indigo-700 hover:text-indigo-800 underline underline-offset-2"
                >
                  새 SKU 등록 →
                </a>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onPick(p)
                        setOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-indigo-50/60 transition-colors"
                    >
                      <p className="flex items-center gap-1.5 text-sm text-slate-900">
                        {p.is_favorite && (
                          <svg
                            className="w-3.5 h-3.5 shrink-0 fill-amber-500"
                            viewBox="0 0 20 20"
                            aria-label="즐겨찾기"
                          >
                            <path d="M9.04 2.927c.3-.92 1.62-.92 1.92 0l1.5 4.612h4.85c.969 0 1.371 1.24.588 1.81l-3.926 2.852 1.5 4.612c.3.921-.755 1.688-1.539 1.118L10 14.98l-3.926 2.852c-.784.57-1.838-.197-1.539-1.118l1.5-4.612L2.108 9.35c-.783-.57-.38-1.81.588-1.81h4.85l1.5-4.612z" />
                          </svg>
                        )}
                        <span className="truncate">{p.display_name}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        <span className="font-mono">{p.seller_sku}</span>
                        {p.default_supplier_site && (
                          <span className="ml-2 inline-flex items-center rounded bg-sky-50 border border-sky-200 px-1 py-0 text-[9px] font-medium text-sky-700">
                            {p.default_supplier_site}
                          </span>
                        )}
                        {p.default_unit_price != null && p.default_currency && (
                          <span className="ml-2 text-slate-600 tabular-nums">
                            {p.default_unit_price} {p.default_currency}
                          </span>
                        )}
                        {lossSkus[p.id] != null && (
                          <span
                            className="ml-2 inline-flex items-center rounded bg-rose-50 border border-rose-200 px-1 py-0 text-[9px] font-semibold text-rose-700"
                            title={`최근 평균 판매가 기준 단위당 약 ${Math.round(lossSkus[p.id]).toLocaleString('ko-KR')}원 손실 추정`}
                          >
                            ⚠ 손실
                          </span>
                        )}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 인라인 빠른 등록 — 검색 결과 없을 때 컨텍스트 스위치 없이 SKU 생성 */}
          <div className="border-t border-slate-100 p-2">
            {!quickOpen ? (
              <button
                type="button"
                onClick={() => { setQuickOpen(true); setQSku(q.trim()) }}
                className="w-full text-left px-1.5 py-1 text-xs font-semibold text-indigo-700 hover:text-indigo-800"
              >
                + 빠른 등록 (이 화면에서 새 SKU)
              </button>
            ) : (
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    value={qSku}
                    onChange={(e) => setQSku(e.target.value)}
                    placeholder="SKU 코드*"
                    aria-label="SKU 코드"
                    className="px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    value={qName}
                    onChange={(e) => setQName(e.target.value)}
                    placeholder="상품명*"
                    aria-label="상품명"
                    className="px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <select
                    value={qSupplier}
                    onChange={(e) => setQSupplier(e.target.value)}
                    aria-label="기본 매입처"
                    className="px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">매입처(선택)</option>
                    {SUPPLIER_SITES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <div className="flex gap-1.5">
                    <select
                      value={qCurrency}
                      onChange={(e) => setQCurrency(e.target.value)}
                      aria-label="기본 통화"
                      className="w-16 px-1.5 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">통화</option>
                      {CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.code}</option>
                      ))}
                    </select>
                    <input
                      value={qPrice}
                      onChange={(e) => setQPrice(e.target.value)}
                      type="number"
                      step="any"
                      placeholder="단가"
                      aria-label="기본 단가"
                      className="flex-1 min-w-0 px-2 py-1 text-xs text-right tabular-nums border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                {createError && <p className="text-[11px] text-rose-600">{createError}</p>}
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setQuickOpen(false); setCreateError(null) }}
                    className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={submitQuickCreate}
                    disabled={creating || !qSku.trim() || !qName.trim()}
                    className="px-2.5 py-1 text-xs font-semibold rounded text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {creating ? '등록 중…' : '등록 후 선택'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
