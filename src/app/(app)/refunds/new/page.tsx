import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/auth/server'
import NewRefundForm from './NewRefundForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '환불 등록',
  robots: { index: false },
}

type OrderItemRow = {
  id: string
  display_order: number
  product_name: string
  quantity: number
  sale_price_krw: number | string | null
}

type OrderRow = {
  id: string
  order_number: string
  market_order_number: string | null
  buyer_name: string | null
  marketplace: string | null
  status: string
  b2b_order_items: OrderItemRow[] | null
}

export default async function NewRefundPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>
}) {
  const params = await searchParams
  const orderId = params.order_id?.trim() ?? ''

  if (!orderId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
    return (
      <div className="max-w-2xl mx-auto p-8 space-y-4">
        <h1 className="text-xl font-bold text-slate-900">환불 등록</h1>
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          유효한 주문이 지정되지 않았습니다. 먼저 주문 목록에서 환불 대상 주문을 선택하세요.
        </div>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          주문 목록으로
        </Link>
      </div>
    )
  }

  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) redirect('/login')

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <p className="text-sm text-slate-600">사업자 계정이 없습니다.</p>
      </div>
    )
  }

  const { data: order } = (await sb
    .from('b2b_orders')
    .select(
      'id, order_number, market_order_number, buyer_name, marketplace, status, b2b_order_items(id, display_order, product_name, quantity, sale_price_krw)',
    )
    .eq('id', orderId)
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .maybeSingle()) as { data: OrderRow | null }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto p-8 space-y-4">
        <h1 className="text-xl font-bold text-slate-900">환불 등록</h1>
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          주문을 찾을 수 없습니다.
        </div>
        <Link href="/orders" className="text-sm text-indigo-700 hover:underline">
          주문 목록으로
        </Link>
      </div>
    )
  }

  const items = (order.b2b_order_items ?? []).slice().sort((a, b) => a.display_order - b.display_order)
  const totalSale = items.reduce((s, it) => {
    const v = it.sale_price_krw
    if (v == null || v === '') return s
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? s + n : s
  }, 0)

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <header className="space-y-1">
        <Link
          href={`/orders/${order.id}`}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          주문 상세로
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">환불 요청 등록</h1>
        <p className="text-sm text-slate-600">
          주문{' '}
          <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
            {order.market_order_number ?? order.order_number}
          </span>{' '}
          · 구매자 <span className="font-medium text-slate-900">{order.buyer_name ?? '—'}</span>
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-rose-500 bg-white shadow-sm p-6">
        <NewRefundForm
          orderId={order.id}
          items={items.map((it) => ({
            id: it.id,
            display_order: it.display_order,
            product_name: it.product_name,
            quantity: it.quantity,
            sale_price_krw: it.sale_price_krw,
          }))}
          totalSale={totalSale > 0 ? totalSale : null}
        />
      </section>
    </div>
  )
}
