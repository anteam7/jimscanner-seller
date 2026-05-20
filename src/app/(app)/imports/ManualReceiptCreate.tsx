'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const SOURCE_OPTIONS = [
  { value: 'rakuten', label: '라쿠텐' },
  { value: 'yahoo', label: '야후 옥션·쇼핑' },
  { value: 'mercari', label: '메루카리' },
  { value: 'taobao', label: '타오바오' },
  { value: 'tmall', label: '티몰' },
  { value: 'aliexpress', label: '알리익스프레스' },
  { value: '1688', label: '1688' },
  { value: 'amazon_de', label: '아마존 DE' },
  { value: 'amazon_uk', label: '아마존 UK' },
  { value: 'amazon_ca', label: '아마존 CA' },
  { value: 'ebay', label: 'eBay' },
  { value: 'walmart', label: 'Walmart' },
  { value: 'target', label: 'Target' },
  { value: 'other', label: '기타' },
]

const CURRENCY_OPTIONS = ['USD', 'JPY', 'CNY', 'EUR', 'GBP', 'HKD', 'KRW']

type ItemInput = {
  name: string
  qty: string
  unit_price: string
  product_url: string
}

export function ManualReceiptCreate() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    source: 'rakuten',
    supplier_order_number: '',
    purchased_at: new Date().toISOString().slice(0, 10),
    currency: 'JPY',
    subtotal_foreign: '',
    shipping_foreign: '',
    tax_foreign: '',
    total_foreign: '',
    source_url: '',
    user_note: '',
  })
  const [items, setItems] = useState<ItemInput[]>([{ name: '', qty: '1', unit_price: '', product_url: '' }])

  function addItem() {
    setItems((prev) => [...prev, { name: '', qty: '1', unit_price: '', product_url: '' }])
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }
  function updateItem(i: number, key: keyof ItemInput, value: string) {
    setItems((prev) => {
      const next = prev.slice()
      next[i] = { ...next[i], [key]: value }
      return next
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.supplier_order_number.trim()) {
      setError('매입 주문번호를 입력하세요.')
      return
    }
    const validItems = items
      .filter((it) => it.name.trim())
      .map((it) => ({
        name: it.name.trim(),
        qty: Number(it.qty) || 1,
        unit_price: it.unit_price ? Number(it.unit_price) : null,
        product_url: it.product_url.trim() || null,
      }))
    if (validItems.length === 0) {
      setError('상품을 1개 이상 입력하세요.')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/imports/supplier-orders/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: form.source,
          supplier_order_number: form.supplier_order_number.trim(),
          purchased_at: form.purchased_at,
          currency: form.currency,
          subtotal_foreign: form.subtotal_foreign ? Number(form.subtotal_foreign) : null,
          shipping_foreign: form.shipping_foreign ? Number(form.shipping_foreign) : null,
          tax_foreign: form.tax_foreign ? Number(form.tax_foreign) : null,
          total_foreign: form.total_foreign ? Number(form.total_foreign) : null,
          items: validItems,
          source_url: form.source_url.trim() || null,
          user_note: form.user_note.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data.error ?? '등록 실패')
        setBusy(false)
        return
      }
      // 초기화
      setForm({
        source: 'rakuten', supplier_order_number: '', purchased_at: new Date().toISOString().slice(0, 10),
        currency: 'JPY', subtotal_foreign: '', shipping_foreign: '', tax_foreign: '',
        total_foreign: '', source_url: '', user_note: '',
      })
      setItems([{ name: '', qty: '1', unit_price: '', product_url: '' }])
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
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold text-indigo-700 border border-indigo-200 bg-white hover:bg-indigo-50 transition-colors"
        title="확장이 자동 수집 못 하는 매입처 (라쿠텐·타오바오 등) 영수증을 수동 등록"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 14 14" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 2v10M2 7h10" />
        </svg>
        영수증 수동 등록
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-lg bg-white shadow-sm border border-slate-200 border-l-[3px] border-l-indigo-500 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">영수증 수동 등록 (확장 미지원 매입처)</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:text-slate-700">취소</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">매입처 *</label>
          <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {SOURCE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">매입 주문번호 *</label>
          <input type="text" value={form.supplier_order_number}
            onChange={(e) => setForm({ ...form, supplier_order_number: e.target.value })}
            placeholder="예: 123456789"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            required />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">매입일</label>
          <input type="date" value={form.purchased_at}
            onChange={(e) => setForm({ ...form, purchased_at: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">통화</label>
          <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {CURRENCY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">소계 (상품 합)</label>
          <input type="number" step="0.01" min={0} value={form.subtotal_foreign}
            onChange={(e) => setForm({ ...form, subtotal_foreign: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">배송비</label>
          <input type="number" step="0.01" min={0} value={form.shipping_foreign}
            onChange={(e) => setForm({ ...form, shipping_foreign: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">세금·기타</label>
          <input type="number" step="0.01" min={0} value={form.tax_foreign}
            onChange={(e) => setForm({ ...form, tax_foreign: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">총액 *</label>
          <input type="number" step="0.01" min={0} value={form.total_foreign}
            onChange={(e) => setForm({ ...form, total_foreign: e.target.value })}
            placeholder="결제한 총액"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[11px] font-semibold text-slate-700 mb-1">매입 페이지 URL (선택)</label>
          <input type="url" value={form.source_url}
            onChange={(e) => setForm({ ...form, source_url: e.target.value })}
            placeholder="https://rakuten.co.jp/..."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-slate-700">상품 (1건 이상)</p>
          <button type="button" onClick={addItem}
            className="text-[11px] text-indigo-700 hover:underline font-semibold">+ 상품 추가</button>
        </div>
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-5">
              <label className="block text-[10px] text-slate-500 mb-0.5">상품명</label>
              <input type="text" value={it.name}
                onChange={(e) => updateItem(i, 'name', e.target.value)}
                placeholder="예: SK-II 한정판"
                className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] text-slate-500 mb-0.5">수량</label>
              <input type="number" min={1} value={it.qty}
                onChange={(e) => updateItem(i, 'qty', e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 tabular-nums" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] text-slate-500 mb-0.5">단가</label>
              <input type="number" step="0.01" min={0} value={it.unit_price}
                onChange={(e) => updateItem(i, 'unit_price', e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 tabular-nums" />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] text-slate-500 mb-0.5">상품 URL</label>
              <input type="url" value={it.product_url}
                onChange={(e) => updateItem(i, 'product_url', e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div className="col-span-1">
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(i)}
                  className="w-full px-1 py-1.5 text-[10px] text-rose-600 hover:bg-rose-50 rounded">삭제</button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-slate-700 mb-1">메모 (선택)</label>
        <textarea value={form.user_note}
          onChange={(e) => setForm({ ...form, user_note: e.target.value })}
          rows={2}
          placeholder="예: 라쿠텐 슈퍼세일 포인트 ¥3,000 환급 예정"
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-vertical" />
      </div>

      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50">취소</button>
        <button type="submit" disabled={busy}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md disabled:opacity-50">
          {busy ? '등록 중…' : '영수증 등록'}
        </button>
      </div>
    </form>
  )
}
