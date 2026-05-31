'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import BulkExportModal, { type SelectedOrderInfo } from './BulkExportModal'
import type { ForwarderTemplateLite } from './ForwarderExportModal'
import { formatKRW, formatDate } from '@/lib/b2b/format'

const LAST_CLICK_KEY = 'b2bOrdersLastClickedId'
const LAST_SCROLL_KEY = 'b2bOrdersScrollY'

const BULK_STATUS_OPTIONS = [
  { value: 'confirmed', label: '매입 발주 완료' },
  { value: 'paid', label: '해외 매입 완료' },
  { value: 'forwarder_submitted', label: '배대지 입고' },
  { value: 'in_transit', label: '운송 중' },
  { value: 'arrived_korea', label: '한국 통관' },
  { value: 'delivered', label: '구매자 수령' },
  { value: 'completed', label: '구매 확정' },
  { value: 'cancelled', label: '취소' },
]

function BulkStatusChange({ orderIds, onDone }: { orderIds: string[]; onDone: () => void }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function apply(status: string) {
    if (!confirm(`선택한 ${orderIds.length}건을 [${BULK_STATUS_OPTIONS.find((s) => s.value === status)?.label}] 로 변경합니다. 계속할까요?`)) return
    setBusy(true)
    setError(null)
    let ok = 0, fail = 0
    await Promise.all(orderIds.map(async (id) => {
      try {
        const res = await fetch(`/api/orders/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        })
        if (res.ok) ok++; else fail++
      } catch { fail++ }
    }))
    setBusy(false)
    if (fail > 0) setError(`${ok}건 성공 / ${fail}건 실패 (전이 불가 등)`)
    router.refresh()
    if (fail === 0) onDone()
  }
  return (
    <div className="flex items-center gap-1.5">
      <select
        disabled={busy}
        onChange={(e) => { if (e.target.value) apply(e.target.value); e.target.value = '' }}
        defaultValue=""
        className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white text-slate-700 disabled:opacity-50"
        title="선택한 주문 일괄 상태 변경"
      >
        <option value="">상태 변경…</option>
        {BULK_STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      {error && <span className="text-[10px] text-rose-600 max-w-[200px] truncate" title={error}>{error}</span>}
    </div>
  )
}

export type OrderRow = {
  id: string
  order_number: string
  status: string
  order_date: string
  marketplace: string | null
  market_order_number: string | null
  buyer_name: string | null
  buyer_phone: string | null
  buyer_postal_code: string | null
  buyer_address: string | null
  buyer_customs_code: string | null
  request_notes: string | null
  created_at: string
  b2b_order_items: { product_name: string; sale_price_krw: number | string | null }[] | null
  receipt_count?: number
}

type Props = {
  orders: OrderRow[]
  templates: ForwarderTemplateLite[]
  marketplaceLabel: Record<string, string>
  statusMeta: Record<string, { label: string; cls: string }>
}

function sumSale(items: { sale_price_krw: number | string | null }[]): number | null {
  let total = 0
  let any = false
  for (const it of items) {
    const v = it.sale_price_krw
    if (v == null || v === '') continue
    const n = typeof v === 'number' ? v : Number(v)
    if (Number.isFinite(n)) {
      total += n
      any = true
    }
  }
  return any ? total : null
}

export default function OrderListClient({ orders, templates, marketplaceLabel, statusMeta }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkOpen, setBulkOpen] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map())

  useEffect(() => {
    if (typeof window === 'undefined') return
    const lastId = sessionStorage.getItem(LAST_CLICK_KEY)
    const scrollY = sessionStorage.getItem(LAST_SCROLL_KEY)
    if (!lastId) return
    sessionStorage.removeItem(LAST_CLICK_KEY)
    sessionStorage.removeItem(LAST_SCROLL_KEY)
    const exists = orders.some((o) => o.id === lastId)
    if (!exists) return
    // sessionStorage 기반 1회성 UI cue (highlight + scroll) — 외부 store 동기화 의도
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlightId(lastId)
    requestAnimationFrame(() => {
      const row = rowRefs.current.get(lastId)
      if (row) {
        row.scrollIntoView({ block: 'center', behavior: 'auto' })
      } else if (scrollY) {
        const y = Number.parseInt(scrollY, 10)
        if (Number.isFinite(y)) window.scrollTo({ top: y, behavior: 'auto' })
      }
    })
    const timer = window.setTimeout(() => setHighlightId(null), 2000)
    return () => window.clearTimeout(timer)
  }, [orders])

  function rememberClick(id: string) {
    if (typeof window === 'undefined') return
    sessionStorage.setItem(LAST_CLICK_KEY, id)
    sessionStorage.setItem(LAST_SCROLL_KEY, String(window.scrollY))
  }

  const allSelected = orders.length > 0 && selected.size === orders.length
  const someSelected = selected.size > 0 && !allSelected

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(orders.map((o) => o.id)))
  }

  const selectedOrders = useMemo(
    () => orders.filter((o) => selected.has(o.id)),
    [orders, selected],
  )

  // 합배송 그룹화 미리보기 — 같은 수취인+연락처+우편번호 키로 묶음
  const groupCount = useMemo(() => {
    const keys = new Set<string>()
    for (const o of selectedOrders) {
      keys.add(`${o.buyer_name ?? ''}|${o.buyer_phone ?? ''}|${o.buyer_postal_code ?? ''}`)
    }
    return keys.size
  }, [selectedOrders])

  return (
    <>
      {/* 선택 액션 바 */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-30 rounded-xl border border-indigo-200 bg-indigo-50 shadow-sm px-4 py-3 flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-semibold text-indigo-900">{selected.size}건 선택됨</span>
            {groupCount > 0 && groupCount < selected.size && (
              <span className="text-xs text-indigo-700">
                · 같은 수취인 {groupCount}그룹으로 묶임
              </span>
            )}
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs text-indigo-700 hover:text-indigo-900 underline underline-offset-2"
            >
              선택 해제
            </button>
          </div>
          <div className="flex items-center gap-2">
            <BulkStatusChange
              orderIds={Array.from(selected)}
              onDone={() => setSelected(new Set())}
            />
            <button
              type="button"
              onClick={() => setBulkOpen(true)}
              disabled={templates.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              양식 변환
            </button>
          </div>
        </div>
      )}

      {/* 목록 */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left">
                <th scope="col" className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    aria-label="전체 선택"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected
                    }}
                    onChange={toggleAll}
                    className="rounded border-slate-300"
                  />
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap">마켓</th>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap">마켓 주문번호</th>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap">구매자</th>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">상품</th>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap">상태</th>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap">영수증 매칭</th>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap text-right">판매가</th>
                <th scope="col" className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap">주문일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((o) => {
                const items = o.b2b_order_items ?? []
                const firstName = items[0]?.product_name ?? '—'
                const extra = items.length > 1 ? ` 외 ${items.length - 1}건` : ''
                const totalSale = sumSale(items)
                const detailHref = `/orders/${o.id}`
                const meta = statusMeta[o.status] ?? statusMeta.pending
                const checked = selected.has(o.id)
                const isHighlighted = highlightId === o.id
                return (
                  <tr
                    key={o.id}
                    ref={(el) => {
                      if (el) rowRefs.current.set(o.id, el)
                      else rowRefs.current.delete(o.id)
                    }}
                    className={`transition-colors ${
                      isHighlighted
                        ? 'bg-amber-50 ring-2 ring-amber-300 ring-inset'
                        : checked
                          ? 'bg-indigo-50/40 hover:bg-indigo-50/60'
                          : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        aria-label={`주문 ${o.market_order_number ?? o.order_number} 선택`}
                        checked={checked}
                        onChange={() => toggle(o.id)}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {o.marketplace ? (
                        <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 whitespace-nowrap">
                          {marketplaceLabel[o.marketplace] ?? o.marketplace}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={detailHref}
                        onClick={() => rememberClick(o.id)}
                        className="font-mono text-xs font-semibold text-slate-900 hover:text-indigo-700 transition-colors"
                      >
                        {o.market_order_number ?? (
                          <span className="text-slate-400 font-sans font-normal">{o.order_number}</span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {o.buyer_name ?? <span className="text-slate-400">미입력</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-[260px] truncate">
                      {firstName}
                      {extra && <span className="text-slate-400 text-xs ml-1">{extra}</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${meta.cls}`}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {(o.receipt_count ?? 0) > 0 ? (
                        <Link
                          href={`/orders/matching`}
                          className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100"
                          title="주문매칭관리로 이동"
                        >
                          📦 {o.receipt_count}건
                        </Link>
                      ) : (
                        <Link
                          href={`/orders/matching`}
                          className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100"
                          title="영수증 매칭 필요"
                        >
                          ⚠️ 대기
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-medium text-slate-700 tabular-nums">
                      {formatKRW(totalSale)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 text-xs">
                      {formatDate(o.order_date)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <BulkExportModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        templates={templates}
        orderIds={Array.from(selected)}
        orderCount={selected.size}
        groupCount={groupCount}
        selectedOrders={selectedOrders.map<SelectedOrderInfo>((o) => ({
          id: o.id,
          market_order_number: o.market_order_number,
          order_number: o.order_number,
          buyer_name: o.buyer_name,
          buyer_phone: o.buyer_phone,
          buyer_postal_code: o.buyer_postal_code,
          buyer_address: o.buyer_address,
          buyer_customs_code: o.buyer_customs_code,
        }))}
        onSuccess={() => setSelected(new Set())}
      />
    </>
  )
}
