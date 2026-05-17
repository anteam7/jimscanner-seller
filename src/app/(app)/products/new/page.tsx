import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'
import ProductForm, { type ForwarderOption } from '@/components/b2b/ProductForm'

export const metadata: Metadata = {
  title: '새 SKU 등록',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

export default async function NewProductPage() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: fwdRows } = await db
    .from('forwarders')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })
  const forwarders = (fwdRows ?? []) as ForwarderOption[]

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
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">새 SKU 등록</h1>
          <p className="text-sm text-slate-600 mt-1">반복 주문되는 상품을 등록하면 다음 주문부터 자동 채워집니다.</p>
        </div>
      </div>
      <ProductForm mode="create" forwarders={forwarders} />
    </div>
  )
}
