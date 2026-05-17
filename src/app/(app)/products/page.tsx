import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'
import { SUPPLIER_SITES } from '@/lib/b2b/order-options'

export const metadata: Metadata = {
  title: '상품 SKU',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

type ProductRow = {
  id: string
  seller_sku: string
  display_name: string
  english_name: string | null
  category: string | null
  default_supplier_site: string | null
  default_currency: string | null
  default_unit_price: number | string | null
  is_active: boolean
  updated_at: string
}

const SUPPLIER_LABEL: Record<string, string> = Object.fromEntries(
  SUPPLIER_SITES.map((s) => [s.value, s.label]),
)

function formatPrice(p: number | string | null, c: string | null): string {
  if (p == null || c == null) return '—'
  const n = typeof p === 'number' ? p : Number(p)
  if (!Number.isFinite(n)) return '—'
  return `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(n)} ${c}`
}

function formatDateTime(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q: query = '' } = await searchParams

  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return null

  let qb = db
    .from('b2b_products')
    .select('id, seller_sku, display_name, english_name, category, default_supplier_site, default_currency, default_unit_price, is_active, updated_at')
    .eq('account_id', account.id)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(200)
  if (query.trim()) {
    const term = query.trim().replace(/[%,]/g, '')
    qb = qb.or(`seller_sku.ilike.%${term}%,display_name.ilike.%${term}%,english_name.ilike.%${term}%`)
  }
  const { data: rows } = (await qb) as { data: ProductRow[] | null }
  const products = rows ?? []

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">상품 SKU</h1>
          <p className="text-sm text-slate-600 mt-1">
            반복 주문되는 상품을 한 번 등록하면 다음 주문부터 매입처·매입가·배대지가 자동 채워집니다.
          </p>
        </div>
        <Link
          href="/products/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 14 14" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 2v10M2 7h10" />
          </svg>
          새 SKU 등록
        </Link>
      </div>

      {/* 검색 */}
      <form method="get" className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex items-center gap-2">
        <label htmlFor="q" className="text-xs text-slate-500">검색</label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="SKU 코드 / 상품명 / 영문명"
          className="flex-1 max-w-sm px-3 py-1.5 text-sm border border-slate-200 rounded-md bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <button
          type="submit"
          className="px-3 py-1.5 text-xs font-semibold rounded-md text-slate-700 border border-slate-200 bg-white hover:bg-slate-50"
        >
          적용
        </button>
        {query && (
          <Link href="/products" className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2">
            초기화
          </Link>
        )}
      </form>

      {products.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-12 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-900">
            {query ? '검색 결과가 없습니다' : '아직 등록된 SKU 가 없습니다'}
          </h2>
          {!query && (
            <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
              반복되는 상품을 SKU 로 한 번 등록하면 매번 같은 정보를 다시 입력할 필요가 없습니다.
            </p>
          )}
          {!query && (
            <Link
              href="/products/new"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 14 14" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 2v10M2 7h10" />
              </svg>
              새 SKU 등록
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap">SKU</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">상품명</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap">분류</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap">기본 매입처</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap text-right">기본 단가</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap">갱신</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link href={`/products/${p.id}`} className="font-mono text-xs font-semibold text-indigo-700 hover:text-indigo-800">
                        {p.seller_sku}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-900">{p.display_name}</p>
                      {p.english_name && <p className="text-xs text-slate-500 mt-0.5">{p.english_name}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-xs whitespace-nowrap">
                      {p.category || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {p.default_supplier_site ? (
                        <span className="inline-flex items-center rounded bg-sky-50 border border-sky-200 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
                          {SUPPLIER_LABEL[p.default_supplier_site] ?? p.default_supplier_site}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums text-slate-700">
                      {formatPrice(p.default_unit_price, p.default_currency)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                      {formatDateTime(p.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
