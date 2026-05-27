import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import { getExchangeRates } from '@/lib/b2b/exchange-rate'
import DeleteButton from './DeleteButton'
import { MultiMatchPanel } from './MultiMatchPanel'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '매입 영수증 상세 · 짐스캐너 SELLER',
  robots: { index: false, follow: false },
}

const SOURCE_LABEL: Record<string, string> = {
  amazon_us: '아마존 US',
  amazon_jp: '아마존 JP',
  rakuten: '라쿠텐',
  yahoo: '야후',
}

type Item = {
  name: string | null
  qty?: number
  unit_price?: number | null
  asin?: string | null
  image_url?: string | null
  product_url?: string | null
}

type Row = {
  id: string
  source: string
  supplier_order_number: string
  purchased_at: string | null
  currency: string | null
  subtotal_foreign: number | string | null
  shipping_foreign: number | string | null
  tax_foreign: number | string | null
  total_foreign: number | string | null
  items: Item[] | null
  source_url: string | null
  raw_meta: Record<string, unknown> | null
  matched_order_id: string | null
  matched_at: string | null
  created_at: string
}

function num(v: number | string | null | undefined): number | null {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function formatForeign(v: number | string | null | undefined, currency: string | null): string {
  const n = num(v)
  if (n == null) return '—'
  if (currency === 'KRW') return `₩${Math.round(n).toLocaleString('ko-KR')}`
  if (currency === 'JPY') return `¥${n.toLocaleString('ko-KR')}`
  if (currency === 'USD') return `$${n.toFixed(2)}`
  return `${n.toLocaleString('ko-KR')} ${currency ?? ''}`.trim()
}

function formatKRW(n: number): string {
  return `₩${Math.round(n).toLocaleString('ko-KR')}`
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yy}.${mm}.${dd} ${hh}:${mi}`
}

function buildSupplierUrl(source: string, orderNumber: string): string | null {
  if (source === 'amazon_us') return `https://www.amazon.com/gp/your-account/order-details?orderID=${encodeURIComponent(orderNumber)}`
  if (source === 'amazon_jp') return `https://www.amazon.co.jp/gp/your-account/order-details?orderID=${encodeURIComponent(orderNumber)}`
  if (source === 'amazon_de') return `https://www.amazon.de/gp/your-account/order-details?orderID=${encodeURIComponent(orderNumber)}`
  if (source === 'amazon_uk') return `https://www.amazon.co.uk/gp/your-account/order-details?orderID=${encodeURIComponent(orderNumber)}`
  if (source === 'amazon_ca') return `https://www.amazon.ca/gp/your-account/order-details?orderID=${encodeURIComponent(orderNumber)}`
  if (source === 'rakuten') return `https://order.my.rakuten.co.jp/?l-id=order-history`
  if (source === 'yahoo') return `https://order.shopping.yahoo.co.jp/`
  if (source === 'mercari') return `https://jp.mercari.com/mypage/purchases`
  if (source === 'taobao') return `https://buyertrade.taobao.com/trade/itemlist/list_bought_items.htm`
  if (source === 'tmall') return `https://buyertrade.tmall.com/trade/itemlist/list_bought_items.htm`
  if (source === 'aliexpress') return `https://www.aliexpress.com/p/order/index.html`
  if (source === '1688') return `https://trade.1688.com/order/buyer_order_list.htm`
  if (source === 'ebay') return `https://www.ebay.com/mye/myebay/purchase`
  if (source === 'walmart') return `https://www.walmart.com/orders`
  if (source === 'target') return `https://www.target.com/orders`
  return null
}

export default async function ImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return <div className="p-8 text-sm text-slate-600">로그인이 필요합니다.</div>

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return <div className="p-8 text-sm text-slate-600">사업자 계정이 없습니다.</div>

  const admin = createAdminClient()
  const { data: rowRaw } = await admin
    .from('b2b_supplier_purchases')
    .select(
      'id, source, supplier_order_number, purchased_at, currency, subtotal_foreign, shipping_foreign, tax_foreign, total_foreign, items, source_url, raw_meta, matched_order_id, matched_at, created_at, account_id',
    )
    .eq('id', id)
    .eq('account_id', account.id)
    .single()

  if (!rowRaw) notFound()
  const row = rowRaw as unknown as Row

  // 매칭 audit log
  type AuditRow = {
    id: string
    changed_at: string
    field_name: string
    old_value: string | null
    new_value: string | null
    reason: string | null
  }
  const { data: auditRaw } = await admin
    .from('b2b_supplier_purchases_audit')
    .select('id, changed_at, field_name, old_value, new_value, reason')
    .eq('receipt_id', id)
    .eq('account_id', account.id)
    .order('changed_at', { ascending: false })
    .limit(20)
  const auditLog = (auditRaw ?? []) as AuditRow[]

  // 환율 환산 (실패 시 fallback)
  let rate: { rate: number; unit: number } | null = null
  if (row.currency && row.currency !== 'KRW') {
    try {
      const ex = await getExchangeRates()
      const r = ex.rates[row.currency]
      if (r) rate = { rate: r.rate, unit: r.unit }
    } catch {
      rate = null
    }
  }
  function toKrw(amount: number | null): number | null {
    if (amount == null) return null
    if (row.currency === 'KRW') return Math.round(amount) // 이미 원화 — 환산 불필요
    if (!rate) return null
    return Math.round((amount * rate.rate) / (rate.unit || 1))
  }

  const items = row.items ?? []
  const totalKrw = toKrw(num(row.total_foreign))
  const supplierUrl = buildSupplierUrl(row.source, row.supplier_order_number) ?? row.source_url

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <header className="flex items-center justify-between">
        <Link href="/imports" className="text-xs text-slate-500 hover:text-slate-700">← 해외 주문 목록</Link>
        <DeleteButton id={row.id} label={row.supplier_order_number} />
      </header>

      {/* 상단 요약 */}
      <section className="rounded-lg bg-white shadow-sm border border-slate-200 border-l-[3px] border-l-indigo-500 px-5 py-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded">
                {SOURCE_LABEL[row.source] ?? row.source}
              </span>
              {row.matched_order_id ? (
                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded">
                  매칭됨
                </span>
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded">
                  매칭 대기
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 font-mono">{row.supplier_order_number}</h1>
            <p className="mt-1 text-[11px] text-slate-500">
              매입일 {formatDateTime(row.purchased_at)} · 수집 {formatDateTime(row.created_at)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">합계 ({row.currency ?? '—'})</p>
            <p className="mt-0.5 text-2xl font-bold text-slate-900 tabular-nums">
              {formatForeign(row.total_foreign, row.currency)}
            </p>
            {totalKrw != null && row.currency !== 'KRW' && (
              <p className="text-[11px] text-indigo-700 font-semibold tabular-nums">≈ {formatKRW(totalKrw)}</p>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">상품 소계</p>
            <p className="mt-0.5 tabular-nums font-medium text-slate-900">{formatForeign(row.subtotal_foreign, row.currency)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">배송비</p>
            <p className="mt-0.5 tabular-nums font-medium text-slate-900">{formatForeign(row.shipping_foreign, row.currency)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">세금</p>
            <p className="mt-0.5 tabular-nums font-medium text-slate-900">{formatForeign(row.tax_foreign, row.currency)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">라인 수</p>
            <p className="mt-0.5 tabular-nums font-medium text-slate-900">{items.length}건</p>
          </div>
        </div>

        {supplierUrl && (
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
            <a
              href={supplierUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-800 hover:underline underline-offset-2"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              {SOURCE_LABEL[row.source] ?? row.source} 주문 상세 (로그인 필요)
            </a>
          </div>
        )}
      </section>

      {/* 라인 아이템 */}
      <section className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">상품 {items.length}건</h2>
        </div>
        {items.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs text-slate-500">상품 라인이 없습니다.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((it, i) => {
              const lineKrw = toKrw((num(it.unit_price) ?? 0) * (it.qty ?? 1))
              return (
                <li key={`${it.asin ?? i}-${i}`} className="px-5 py-3 flex items-start gap-3">
                  {it.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={it.image_url}
                      alt=""
                      className="w-12 h-12 rounded-md object-cover bg-slate-100 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-md bg-slate-100 shrink-0 flex items-center justify-center text-slate-400 text-lg">
                      📦
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    {it.product_url ? (
                      <a
                        href={it.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-slate-900 hover:text-indigo-700 line-clamp-2"
                      >
                        {it.name}
                      </a>
                    ) : (
                      <p className="text-sm text-slate-900 line-clamp-2">{it.name}</p>
                    )}
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
                      {it.asin && <span className="font-mono">ASIN {it.asin}</span>}
                      <span>수량 {it.qty ?? 1}</span>
                      {it.unit_price != null && (
                        <span className="tabular-nums">단가 {formatForeign(it.unit_price, row.currency)}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-slate-900 tabular-nums">
                      {it.unit_price != null
                        ? formatForeign((it.unit_price ?? 0) * (it.qty ?? 1), row.currency)
                        : '—'}
                    </p>
                    {lineKrw != null && row.currency !== 'KRW' && (
                      <p className="text-[11px] text-indigo-700 tabular-nums">≈ {formatKRW(lineKrw)}</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* 메타 */}
      <details className="rounded-lg bg-white shadow-sm border border-slate-200 px-5 py-3">
        <summary className="text-xs font-semibold text-slate-700 cursor-pointer">
          수집 메타 (디버깅용)
        </summary>
        <pre className="mt-3 text-[10px] text-slate-600 bg-slate-50 rounded p-3 overflow-x-auto">
{JSON.stringify(
  {
    source_url_stored: row.source_url,
    raw_meta: row.raw_meta,
    matched_order_id: row.matched_order_id,
    matched_at: row.matched_at,
  },
  null,
  2,
)}
        </pre>
      </details>

      {/* 1:N 다중 매칭 패널 */}
      <MultiMatchPanel receiptId={row.id} />

      {/* 매칭 audit log */}
      {auditLog.length > 0 && (
        <section className="rounded-lg bg-white shadow-sm border border-slate-200 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900 mb-3">📜 매칭 이력</h2>
          <ul className="space-y-2">
            {auditLog.map((a) => {
              const d = new Date(a.changed_at)
              const ts = d.toLocaleString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
              const action =
                a.reason === 'manual_link' ? '🔗 매칭'
                : a.reason === 'manual_rematch' ? '🔄 재매칭'
                : a.reason === 'manual_unlink' ? '✗ 해제'
                : a.reason ?? '변경'
              return (
                <li key={a.id} className="flex items-start gap-3 text-xs">
                  <span className="text-slate-400 tabular-nums shrink-0 mt-0.5">{ts}</span>
                  <span className="font-semibold text-slate-700 shrink-0">{action}</span>
                  <span className="text-slate-500 truncate">
                    {a.old_value && <><span className="line-through text-slate-400">{a.old_value.slice(0, 8)}…</span> → </>}
                    {a.new_value ? <span className="font-mono">{a.new_value.slice(0, 8)}…</span> : <span className="text-slate-400">null</span>}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
