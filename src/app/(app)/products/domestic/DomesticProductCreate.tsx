'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const MARKETPLACES = [
  { value: '', label: '— 선택 —' },
  { value: 'coupang', label: '쿠팡' },
  { value: 'smartstore', label: '스마트스토어' },
  { value: 'auction', label: '옥션' },
  { value: 'gmarket', label: '지마켓' },
  { value: '11st', label: '11번가' },
  { value: 'wemakeprice', label: '위메프' },
  { value: 'tmon', label: '티몬' },
  { value: 'interpark', label: '인터파크' },
  { value: 'kakao_gift', label: '카카오선물' },
  { value: 'own_mall', label: '자사몰' },
  { value: 'kakao_channel', label: '카카오채널' },
  { value: 'instagram', label: '인스타' },
  { value: 'other', label: '기타' },
]

export function DomesticProductCreate() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    display_name: '',
    seller_sku: '',
    marketplace: '',
    market_product_id: '',
    market_option: '',
    sale_price_krw: '',
    category: '',
    image_url: '',
    notes: '',
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.display_name.trim()) {
      setError('상품명을 입력하세요.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/domestic-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          sale_price_krw: form.sale_price_krw ? Number(form.sale_price_krw) : null,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data.error ?? '등록 실패')
        setBusy(false)
        return
      }
      setForm({
        display_name: '', seller_sku: '', marketplace: '', market_product_id: '',
        market_option: '', sale_price_krw: '', category: '', image_url: '', notes: '',
      })
      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 14 14" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 2v10M2 7h10" />
        </svg>
        새 국내 상품 등록
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-lg bg-white shadow-sm border border-slate-200 border-l-[3px] border-l-emerald-500 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">새 국내 상품</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:text-slate-700">취소</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label htmlFor="dpc-display-name" className="block text-[11px] font-semibold text-slate-700 mb-1">상품명 *</label>
          <input
            id="dpc-display-name"
            type="text"
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            placeholder="예: 다이슨 V15 디텍트 무선청소기"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        <div>
          <label htmlFor="dpc-seller-sku" className="block text-[11px] font-semibold text-slate-700 mb-1">셀러 SKU (선택)</label>
          <input
            id="dpc-seller-sku"
            type="text"
            value={form.seller_sku}
            onChange={(e) => setForm({ ...form, seller_sku: e.target.value })}
            placeholder="DYSON-V15"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-xs"
          />
        </div>
        <div>
          <label htmlFor="dpc-marketplace" className="block text-[11px] font-semibold text-slate-700 mb-1">마켓</label>
          <select
            id="dpc-marketplace"
            value={form.marketplace}
            onChange={(e) => setForm({ ...form, marketplace: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {MARKETPLACES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="dpc-market-product-id" className="block text-[11px] font-semibold text-slate-700 mb-1">마켓 상품 ID/URL</label>
          <input
            id="dpc-market-product-id"
            type="text"
            value={form.market_product_id}
            onChange={(e) => setForm({ ...form, market_product_id: e.target.value })}
            placeholder="쿠팡 상품번호 또는 URL 일부"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="dpc-market-option" className="block text-[11px] font-semibold text-slate-700 mb-1">옵션 (색상/사이즈)</label>
          <input
            id="dpc-market-option"
            type="text"
            value={form.market_option}
            onChange={(e) => setForm({ ...form, market_option: e.target.value })}
            placeholder="블루 / L"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="dpc-sale-price" className="block text-[11px] font-semibold text-slate-700 mb-1">판매가 (KRW)</label>
          <input
            id="dpc-sale-price"
            type="number"
            min={0}
            value={form.sale_price_krw}
            onChange={(e) => setForm({ ...form, sale_price_krw: e.target.value })}
            placeholder="450000"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 tabular-nums"
          />
        </div>
        <div>
          <label htmlFor="dpc-category" className="block text-[11px] font-semibold text-slate-700 mb-1">카테고리</label>
          <input
            id="dpc-category"
            type="text"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="가전"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="dpc-image-url" className="block text-[11px] font-semibold text-slate-700 mb-1">이미지 URL</label>
          <input
            id="dpc-image-url"
            type="url"
            value={form.image_url}
            onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            placeholder="https://..."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="dpc-notes" className="block text-[11px] font-semibold text-slate-700 mb-1">메모</label>
          <textarea
            id="dpc-notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-vertical"
          />
        </div>
      </div>
      {/* async 등록 진행 announce (항상 DOM 존재, sr-only — 시각·레이아웃 무변경) */}
      <p role="status" aria-live="polite" className="sr-only">
        {busy ? '국내 상품 등록 중…' : ''}
      </p>
      {/* 등록 실패 announce (항상 DOM 존재, 비활성 시 sr-only) */}
      <p role="alert" className={error ? 'text-xs text-rose-600 font-medium' : 'sr-only'}>
        {error ?? ''}
      </p>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={busy}
          aria-busy={busy}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md disabled:opacity-50"
        >
          {busy ? '등록 중…' : '등록'}
        </button>
      </div>
    </form>
  )
}
