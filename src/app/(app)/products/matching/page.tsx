import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'
import { ProductMatchingClient } from './ProductMatchingClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '상품매칭 · 짐스캐너 SELLER',
  description: '국내 상품 ↔ 해외 상품 N:N 매칭.',
  robots: { index: false, follow: false },
}

type DomesticProduct = {
  id: string
  seller_sku: string | null
  display_name: string
  marketplace: string | null
  sale_price_krw: number | string | null
  image_url: string | null
}
type ForeignProduct = {
  id: string
  seller_sku: string
  display_name: string
  english_name: string | null
  default_supplier_site: string | null
  default_currency: string | null
  default_unit_price: number | string | null
  image_url: string | null
}
type Mapping = {
  id: string
  domestic_product_id: string
  foreign_product_id: string
  qty_ratio: number | string
  notes: string | null
  created_at: string
}

export default async function ProductMatchingPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return <div className="p-8 text-sm text-slate-600">로그인이 필요합니다.</div>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db.from('b2b_accounts').select('id').eq('user_id', user.id).single()
  if (!account) return <div className="p-8 text-sm text-slate-600">사업자 계정이 없습니다.</div>

  const [domesticRes, foreignRes, mappingRes] = await Promise.all([
    db.from('b2b_domestic_products')
      .select('id, seller_sku, display_name, marketplace, sale_price_krw, image_url')
      .eq('account_id', account.id).eq('is_active', true)
      .order('updated_at', { ascending: false }).limit(300),
    db.from('b2b_products')
      .select('id, seller_sku, display_name, english_name, default_supplier_site, default_currency, default_unit_price, image_url')
      .eq('account_id', account.id).eq('is_active', true)
      .order('updated_at', { ascending: false }).limit(300),
    db.from('b2b_product_mappings')
      .select('id, domestic_product_id, foreign_product_id, qty_ratio, notes, created_at')
      .eq('account_id', account.id)
      .order('created_at', { ascending: false }),
  ])
  const domesticProducts = (domesticRes.data ?? []) as DomesticProduct[]
  const foreignProducts = (foreignRes.data ?? []) as ForeignProduct[]
  const mappings = (mappingRes.data ?? []) as Mapping[]

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          <span className="bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">상품매칭</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          국내 상품 ↔ 해외 상품 N:N 매칭. 한 국내 상품에 여러 해외 상품 (옵션별/번들) 또는 한 해외 상품을 여러 국내 상품에 연결할 수 있습니다.
        </p>
      </header>

      {domesticProducts.length === 0 ? (
        <div className="rounded-lg bg-white shadow-sm border border-slate-200 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-700">먼저 국내 상품을 등록하세요.</p>
          <Link href="/products/domestic" className="inline-block mt-3 text-xs font-semibold text-indigo-700 hover:underline">
            → 국내 상품관리로 가기
          </Link>
        </div>
      ) : foreignProducts.length === 0 ? (
        <div className="rounded-lg bg-white shadow-sm border border-slate-200 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-700">먼저 해외 상품을 등록하세요.</p>
          <Link href="/products" className="inline-block mt-3 text-xs font-semibold text-indigo-700 hover:underline">
            → 해외 상품관리로 가기
          </Link>
        </div>
      ) : (
        <ProductMatchingClient
          domesticProducts={domesticProducts}
          foreignProducts={foreignProducts}
          mappings={mappings}
        />
      )}
    </div>
  )
}
