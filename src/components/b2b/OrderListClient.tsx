'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import BulkExportModal from './BulkExportModal'
import type { ForwarderTemplateLite } from './ForwarderExportModal'

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
  request_notes: string | null
  created_at: string
  b2b_order_items: { product_name: string; sale_price_krw: number | string | null }[] | null
}

type Props = {
  orders: OrderRow[]
  templates: ForwarderTemplateLite[]
  marketplaceLabel: Record<string, string>
  statusMeta: Record<string, { label: string; cls: string }>
}

function formatKRW(v: number | string | null): string {
  if (v == null || v === '') return '—'
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('ko-KR').format(n) + '원'
}

function formatDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
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
          <button
            type="button"
            onClick={() => setBulkOpen(true)}
            disabled={templates.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            선택한 {selected.size}건 양식 변환
          </button>
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
                return (
                  <tr
                    key={o.id}
                    className={`hover:bg-slate-50/70 transition-colors ${checked ? 'bg-indigo-50/40' : ''}`}
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
        onSuccess={() => setSelected(new Set())}
      />
    </>
  )
}
