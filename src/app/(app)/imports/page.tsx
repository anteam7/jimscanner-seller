import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'
import {
  findCandidates,
  type OrderForMatching,
  type ReceiptForMatching,
} from '@/lib/b2b/import-matcher'
import { ImportMatchAction } from './ImportMatchAction'
import { ManualReceiptCreate } from './ManualReceiptCreate'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '해외 주문 목록 · 짐스캐너 SELLER',
  description: '브라우저 확장이 수집한 해외 매입 (영수증) 목록.',
  robots: { index: false, follow: false },
}

const SOURCE_LABEL: Record<string, string> = {
  amazon_us: '아마존 US',
  amazon_jp: '아마존 JP',
  rakuten: '라쿠텐',
  yahoo: '야후',
}

const MARKETPLACE_LABEL: Record<string, string> = {
  coupang: '쿠팡',
  smartstore: '스마트스토어',
  auction: '옥션',
  gmarket: '지마켓',
  '11st': '11번가',
  wemakeprice: '위메프',
  tmon: '티몬',
  interpark: '인터파크',
  ssg: 'SSG',
  lotte_on: '롯데온',
  kakao: '카카오',
  naver: '네이버',
  self: '자사몰',
  other: '기타',
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
  total_foreign: number | string | null
  items: Item[] | null
  source_url: string | null
  matched_order_id: string | null
  matched_at: string | null
  created_at: string
}

function formatForeign(v: number | string | null | undefined, currency: string | null): string {
  if (v == null) return '—'
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return '—'
  if (currency === 'KRW') return `₩${Math.round(n).toLocaleString('ko-KR')}`
  if (currency === 'JPY') return `¥${n.toLocaleString('ko-KR')}`
  if (currency === 'USD') return `$${n.toFixed(2)}`
  return `${n.toLocaleString('ko-KR')} ${currency ?? ''}`.trim()
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}

function orderDisplayLabel(o: { market_order_number: string | null; order_number: string | null; marketplace: string | null }): string {
  const num = o.market_order_number || o.order_number || '주문'
  const mk = o.marketplace ? MARKETPLACE_LABEL[o.marketplace] ?? o.marketplace : ''
  return mk ? `${mk} ${num}` : num
}

export default async function ImportsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; matched?: string }>
}) {
  const { source: sourceFilter = 'all', matched: matchedFilter = 'all' } = await searchParams
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return <div className="p-8 text-sm text-slate-600">로그인이 필요합니다.</div>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return <div className="p-8 text-sm text-slate-600">사업자 계정이 없습니다.</div>

  let qb = db
    .from('b2b_supplier_purchases')
    .select(
      'id, source, supplier_order_number, purchased_at, currency, total_foreign, items, source_url, matched_order_id, matched_at, created_at',
    )
  if (sourceFilter !== 'all') qb = qb.eq('source', sourceFilter)
  if (matchedFilter === 'matched') qb = qb.not('matched_order_id', 'is', null)
  else if (matchedFilter === 'unmatched') qb = qb.is('matched_order_id', null)

  const { data: rowsRaw } = await qb
    .eq('account_id', account.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const rows = (rowsRaw ?? []) as Row[]
  const total = rows.length
  const unmatched = rows.filter((r) => !r.matched_order_id).length
  const matched = total - unmatched

  // 매칭 후보 계산: 최근 60일 주문 + line items 로딩
  // 매칭된 주문 ID 도 알아야 페널티 적용 + matched 영수증의 주문 라벨 표시
  type OrderRow = {
    id: string
    order_number: string | null
    market_order_number: string | null
    marketplace: string | null
    created_at: string
    b2b_order_items: {
      supplier_site: string | null
      currency: string | null
      qty: number | null
      unit_price_foreign: number | string | null
    }[]
  }

  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  const { data: ordersRaw } = await db
    .from('b2b_orders')
    .select(
      'id, order_number, market_order_number, marketplace, created_at, b2b_order_items(supplier_site, currency, qty, unit_price_foreign)',
    )
    .eq('account_id', account.id)
    .gte('created_at', sixtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(300)

  const orders = (ordersRaw ?? []) as OrderRow[]
  const matchedOrderIds = new Set(
    rows.filter((r) => r.matched_order_id).map((r) => r.matched_order_id!),
  )
  const orderLabelById = new Map<string, string>()
  for (const o of orders) orderLabelById.set(o.id, orderDisplayLabel(o))

  const orderCandidates: OrderForMatching[] = orders.map((o) => ({
    id: o.id,
    order_number: o.order_number,
    market_order_number: o.market_order_number,
    marketplace: o.marketplace,
    created_at: o.created_at,
    has_matched_receipt: matchedOrderIds.has(o.id),
    items: o.b2b_order_items ?? [],
  }))

  function topCandidate(row: Row): { orderId: string; label: string; score: number; reasons: string[] } | null {
    if (row.matched_order_id) return null
    const receipt: ReceiptForMatching = {
      id: row.id,
      source: row.source,
      purchased_at: row.purchased_at,
      currency: row.currency,
      total_foreign: row.total_foreign,
    }
    const cands = findCandidates(receipt, orderCandidates, 1)
    if (cands.length === 0) return null
    const c = cands[0]
    return {
      orderId: c.order.id,
      label: orderDisplayLabel(c.order),
      score: c.score,
      reasons: c.reasons,
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">해외 주문 목록</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            브라우저 확장이 수집한 해외 매입 (영수증) 목록. <b>영수증 1건씩 인라인 매칭</b> — 한 번에 보려면 →
          </p>
        </div>
        <Link
          href="/orders/matching"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold text-indigo-700 border border-indigo-200 bg-white hover:bg-indigo-50 transition-colors whitespace-nowrap"
        >
          📋 주문매칭관리 통합 뷰
        </Link>
      </header>

      <ManualReceiptCreate />

      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="font-semibold text-slate-600 mr-1">필터:</span>
        {[
          { value: 'all', label: '전체' },
          { value: 'amazon_us', label: '🇺🇸 amazon US' },
          { value: 'amazon_jp', label: '🇯🇵 amazon JP' },
          { value: 'rakuten', label: '라쿠텐' },
          { value: 'yahoo', label: '야후' },
          { value: 'taobao', label: '타오바오' },
          { value: 'other', label: '기타' },
        ].map((f) => {
          const isActive = sourceFilter === f.value
          const href = `?source=${f.value}${matchedFilter !== 'all' ? `&matched=${matchedFilter}` : ''}`
          return (
            <Link key={f.value} href={href}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                isActive ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}>{f.label}</Link>
          )
        })}
        <span className="text-slate-300 mx-1">|</span>
        {[
          { value: 'all', label: '매칭 전체' },
          { value: 'matched', label: '✓ 매칭됨' },
          { value: 'unmatched', label: '⚠️ 대기' },
        ].map((f) => {
          const isActive = matchedFilter === f.value
          const href = `?matched=${f.value}${sourceFilter !== 'all' ? `&source=${sourceFilter}` : ''}`
          return (
            <Link key={f.value} href={href}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                isActive ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}>{f.label}</Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg bg-white shadow-sm border-l-[3px] border-l-indigo-500 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">전체 수집</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{total.toLocaleString('ko-KR')}건</p>
        </div>
        <div className="rounded-lg bg-white shadow-sm border-l-[3px] border-l-emerald-500 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">매칭됨</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{matched.toLocaleString('ko-KR')}건</p>
          <p className="mt-0.5 text-[11px] text-emerald-700">짐스캐너 주문에 연결됨</p>
        </div>
        <div className="rounded-lg bg-white shadow-sm border-l-[3px] border-l-amber-500 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">매칭 대기</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{unmatched.toLocaleString('ko-KR')}건</p>
          <p className="mt-0.5 text-[11px] text-amber-700">한국 마켓 주문 필요</p>
        </div>
      </div>

      <div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden">
        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl mb-3">
              📦
            </div>
            <p className="text-sm font-semibold text-slate-700">아직 수집된 영수증이 없습니다.</p>
            <p className="mt-1 text-xs text-slate-500">
              <Link href="/settings/extension" className="text-indigo-700 hover:underline font-semibold underline-offset-2">
                /settings/extension
              </Link>{' '}
              에서 확장 토큰을 발급하고 아마존 주문 페이지에서 가져오기를 시도해 보세요.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-semibold">
                <tr>
                  <th className="px-4 py-2.5 text-left">매입처</th>
                  <th className="px-4 py-2.5 text-left">주문번호</th>
                  <th className="px-4 py-2.5 text-left">상품</th>
                  <th className="px-4 py-2.5 text-right">합계</th>
                  <th className="px-4 py-2.5 text-left">매입일</th>
                  <th className="px-4 py-2.5 text-left">짐스캐너 주문 매칭</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const first = r.items?.[0]
                  const moreCount = (r.items?.length ?? 0) - 1
                  const rec = topCandidate(r)
                  const matchedLabel = r.matched_order_id
                    ? orderLabelById.get(r.matched_order_id) ?? '연결된 주문'
                    : null
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded">
                          {SOURCE_LABEL[r.source] ?? r.source}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/imports/${r.id}`}
                          className="font-mono text-[11px] text-indigo-700 hover:text-indigo-800 hover:underline underline-offset-2"
                          title="짐스캐너에서 영수증 상세 보기"
                        >
                          {r.supplier_order_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {first ? (
                          <div>
                            <p className="text-slate-900 truncate max-w-[320px]">{first.name}</p>
                            {moreCount > 0 && (
                              <p className="text-[11px] text-slate-500 mt-0.5">외 {moreCount}건</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">상품 없음</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                        {formatForeign(r.total_foreign, r.currency)}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-600 tabular-nums">
                        {formatDate(r.purchased_at ?? r.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <ImportMatchAction
                          receiptId={r.id}
                          recommendation={rec}
                          matchedOrderLabel={matchedLabel}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400">
        ※ 매칭 추천 점수: 통화·날짜·금액 일치도. 추천이 없는 영수증은 짐스캐너에 해당 마켓 주문이 아직 등록 안 됨. 정확하지 않으면 [해제] 후 재매칭하세요.
      </p>
      <p className="text-[11px] text-slate-400">
        ⚡ amazon 주문이 여러 박스로 split 발송된 경우 영수증은 1건이지만 박스마다 도착합니다. 매칭 점수가 낮게 나오면 [🔍 검색] 으로 수동 매칭하세요.
      </p>
    </div>
  )
}
