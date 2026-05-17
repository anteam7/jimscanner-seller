import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/auth/server'
import ProductForm, { type ForwarderOption, type MarketLink, type SupplierLink } from '@/components/b2b/ProductForm'

export const metadata: Metadata = {
  title: 'SKU 편집',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

type ProductDetail = {
  id: string
  account_id: string
  seller_sku: string
  display_name: string
  english_name: string | null
  category: string | null
  default_supplier_site: string | null
  default_currency: string | null
  default_unit_price: number | string | null
  default_forwarder_id: string | null
  default_forwarder_country: string | null
  default_weight_kg: number | string | null
  image_url: string | null
  notes: string | null
  is_active: boolean
  b2b_product_market_links: {
    id: string
    marketplace: string
    market_product_id: string
    market_option: string | null
    sale_price_krw: number | string | null
    notes: string | null
  }[] | null
  b2b_product_supplier_links: {
    id: string
    supplier_site: string
    supplier_product_url: string | null
    supplier_unit_price: number | string | null
    supplier_currency: string | null
    is_primary: boolean
    notes: string | null
  }[] | null
}

function toStr(v: number | string | null): string {
  if (v == null || v === '') return ''
  return typeof v === 'number' ? String(v) : v
}

export default async function ProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound()

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

  const { data: p } = (await db
    .from('b2b_products')
    .select(
      '*, b2b_product_market_links(id, marketplace, market_product_id, market_option, sale_price_krw, notes), b2b_product_supplier_links(id, supplier_site, supplier_product_url, supplier_unit_price, supplier_currency, is_primary, notes)',
    )
    .eq('id', id)
    .eq('account_id', account.id)
    .maybeSingle()) as { data: ProductDetail | null }

  if (!p) notFound()

  const { data: fwdRows } = await db
    .from('forwarders')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })
  const forwarders = (fwdRows ?? []) as ForwarderOption[]

  const marketLinks: MarketLink[] = (p.b2b_product_market_links ?? []).map((m) => ({
    id: m.id,
    marketplace: m.marketplace,
    market_product_id: m.market_product_id,
    market_option: m.market_option ?? '',
    sale_price_krw: toStr(m.sale_price_krw),
    notes: m.notes ?? '',
  }))
  const supplierLinks: SupplierLink[] = (p.b2b_product_supplier_links ?? []).map((s) => ({
    id: s.id,
    supplier_site: s.supplier_site,
    supplier_product_url: s.supplier_product_url ?? '',
    supplier_unit_price: toStr(s.supplier_unit_price),
    supplier_currency: s.supplier_currency ?? 'USD',
    is_primary: s.is_primary,
    notes: s.notes ?? '',
  }))

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-start gap-3">
        <Link
          href="/products"
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 mt-1"
          aria-label="SKU 목록으로"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight truncate">{p.display_name}</h1>
          <p className="text-sm text-slate-600 mt-1 font-mono">{p.seller_sku}</p>
        </div>
      </div>
      <ProductForm
        mode="edit"
        forwarders={forwarders}
        initial={{
          id: p.id,
          seller_sku: p.seller_sku,
          display_name: p.display_name,
          english_name: p.english_name ?? '',
          category: p.category ?? '',
          default_supplier_site: p.default_supplier_site ?? '',
          default_currency: p.default_currency ?? 'USD',
          default_unit_price: toStr(p.default_unit_price),
          default_forwarder_id: p.default_forwarder_id ?? '',
          default_forwarder_country: p.default_forwarder_country ?? '',
          default_weight_kg: toStr(p.default_weight_kg),
          image_url: p.image_url ?? '',
          notes: p.notes ?? '',
          market_links: marketLinks,
          supplier_links: supplierLinks,
        }}
      />
    </div>
  )
}
