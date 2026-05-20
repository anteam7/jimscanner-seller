import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'
import { DomesticProductCreate } from './DomesticProductCreate'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '국내 상품관리 · 짐스캐너 SELLER',
  description: '국내 마켓에 등록한 셀러 상품 마스터.',
  robots: { index: false, follow: false },
}

const MARKETPLACE_LABEL: Record<string, string> = {
  coupang: '쿠팡', smartstore: '스마트스토어', auction: '옥션', gmarket: '지마켓',
  '11st': '11번가', wemakeprice: '위메프', tmon: '티몬', interpark: '인터파크',
  kakao_gift: '카카오선물', own_mall: '자사몰', kakao_channel: '카카오채널', instagram: '인스타', other: '기타',
}

type Row = {
  id: string
  seller_sku: string | null
  display_name: string
  marketplace: string | null
  market_product_id: string | null
  market_option: string | null
  sale_price_krw: number | string | null
  category: string | null
  image_url: string | null
  updated_at: string
}

function fmtPrice(p: number | string | null | undefined): string {
  if (p == null) return '—'
  const n = typeof p === 'number' ? p : Number(p)
  if (!Number.isFinite(n)) return '—'
  return `₩${Math.round(n).toLocaleString('ko-KR')}`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}

export default async function DomesticProductsPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return <div className="p-8 text-sm text-slate-600">로그인이 필요합니다.</div>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db.from('b2b_accounts').select('id').eq('user_id', user.id).single()
  if (!account) return <div className="p-8 text-sm text-slate-600">사업자 계정이 없습니다.</div>

  const { data: rowsRaw } = await db
    .from('b2b_domestic_products')
    .select('id, seller_sku, display_name, marketplace, market_product_id, market_option, sale_price_krw, category, image_url, updated_at')
    .eq('account_id', account.id)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(200)
  const rows = (rowsRaw ?? []) as Row[]

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          <span className="bg-gradient-to-r from-emerald-600 to-sky-600 bg-clip-text text-transparent">국내 상품관리</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          쿠팡·스마트스토어 등 국내 마켓에 등록한 상품을 관리합니다. 해외 상품과 매칭하면 자동 주문 매칭에 활용됩니다.
        </p>
      </header>

      <DomesticProductCreate />

      <div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden">
        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl mb-3">🛍️</div>
            <p className="text-sm font-semibold text-slate-700">등록된 국내 상품이 없습니다.</p>
            <p className="mt-1 text-xs text-slate-500">위 폼에서 첫 상품을 등록하세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-semibold">
                <tr>
                  <th className="px-4 py-2.5 text-left">SKU</th>
                  <th className="px-4 py-2.5 text-left">상품명</th>
                  <th className="px-4 py-2.5 text-left">마켓</th>
                  <th className="px-4 py-2.5 text-right">판매가</th>
                  <th className="px-4 py-2.5 text-left">갱신</th>
                  <th className="px-4 py-2.5 text-left">매칭</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-700">{p.seller_sku || '—'}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{p.display_name}</p>
                      {p.market_option && <p className="text-[11px] text-slate-500 mt-0.5">{p.market_option}</p>}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-600">
                      {p.marketplace ? (MARKETPLACE_LABEL[p.marketplace] ?? p.marketplace) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                      {fmtPrice(p.sale_price_krw)}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-600 tabular-nums">{fmtDate(p.updated_at)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/products/matching?domestic=${p.id}`} className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 hover:underline underline-offset-2">
                        해외 상품 매칭 →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400">
        ※ 해외 상품과 N:N 매칭 가능. 한 국내 상품에 여러 해외 상품 (옵션별/번들) 또는 한 해외 상품을 여러 국내 상품에 연결할 수 있습니다.
      </p>
    </div>
  )
}
