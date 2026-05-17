'use client'

import { useEffect, useRef, useState } from 'react'

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
}

type Props = {
  /** 현재 선택된 product id (있으면 chip 표시) */
  selectedId: string | null
  selectedLabel: string | null
  onPick: (p: PickedProduct) => void
  onClear: () => void
}

export default function ProductPicker({ selectedId, selectedLabel, onPick, onClear }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<PickedProduct[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      void fetchResults(q)
    }, 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open])

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

  async function fetchResults(query: string) {
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
      setResults(j.products ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

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
                      <p className="text-sm text-slate-900 truncate">{p.display_name}</p>
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
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
