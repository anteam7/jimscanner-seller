import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'
import { getNearLimitCards } from '@/lib/b2b/card-limits'
import { getExchangeRates } from '@/lib/b2b/exchange-rate'
import { getMarginLossAlerts } from '@/lib/b2b/margin-loss'
import { getRecentSkuPriceHints, type SkuPriceHint } from '@/lib/b2b/sku-price-trend'
import NewOrderForm, {
  type ForwarderOption,
  type RecentBuyer,
  type DuplicateSource,
  type DuplicateLine,
} from './NewOrderForm'

export const metadata: Metadata = {
  title: '새 주문 입력',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ duplicate?: string }>
}) {
  const supabase = await createClient()
  const duplicateId = (await searchParams).duplicate

  // forwarders 는 public read 허용 (main repo schema)
  const { data: rows } = await supabase
    .from('forwarders')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('name', { ascending: true })
    .returns<ForwarderOption[]>()

  const forwarders = rows ?? []

  // 행동 시점 경고: 한도 임박 카드가 있으면 주문 입력 화면 상단에 노출
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let nearLimitCards: Awaited<ReturnType<typeof getNearLimitCards>> = []
  const lossSkus: Record<string, number> = {}
  let priceHints: Record<string, SkuPriceHint> = {}
  let lastForwarderId = ''
  let lastForwarderCountry = ''
  const recentBuyers: RecentBuyer[] = []
  let duplicateSource: DuplicateSource | null = null
  if (user) {
    const { data: account } = await supabase
      .from('b2b_accounts')
      .select('id')
      .eq('user_id', user.id)
      .single()
    if (account) {
      nearLimitCards = await getNearLimitCards(account.id)

      // SKU 매입가 힌트 — 라인에 SKU 매핑 시 최근 평균/최근 단가·인상폭 인라인 표시 (#idea-22)
      priceHints = await getRecentSkuPriceHints(account.id)

      // 주문 복제(재주문) — ?duplicate=<orderId> 로 들어오면 소유 주문을 prefill 소스로 로드
      if (duplicateId) {
        const { data: src } = await supabase
          .from('b2b_orders')
          .select(
            'marketplace, forwarder_id, forwarder_country, buyer_name, buyer_phone, buyer_postal_code, buyer_address, buyer_detail_address, buyer_customs_code, b2b_order_items(display_order, product_id, product_name, product_url, market_option, quantity, currency, unit_price_foreign, weight_kg, sale_price_krw, image_url, supplier_site, forwarder_id, customs_category)',
          )
          .eq('id', duplicateId)
          .eq('account_id', account.id) // 소유권 — RLS 외 명시 가드
          .is('deleted_at', null)
          .maybeSingle()
        if (src) {
          // 라인의 SKU 라벨 (productSku) 조회 — b2b_order_items.product_id FK 미등록이라 별도 쿼리
          const items = (src.b2b_order_items ?? [])
            .slice()
            .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
          const productIds = [...new Set(items.map((i) => i.product_id).filter((v): v is string => !!v))]
          const skuByProductId: Record<string, string | null> = {}
          if (productIds.length > 0) {
            const { data: skuRows } = await supabase
              .from('b2b_products')
              .select('id, seller_sku')
              .eq('account_id', account.id)
              .in('id', productIds)
            for (const r of skuRows ?? []) skuByProductId[r.id] = r.seller_sku
          }
          const dupLines: DuplicateLine[] = items.map((i) => ({
            productId: i.product_id,
            productSku: i.product_id ? skuByProductId[i.product_id] ?? null : null,
            supplierSite: i.supplier_site ?? '',
            productName: i.product_name ?? '',
            productUrl: i.product_url ?? '',
            marketOption: i.market_option ?? '',
            quantity: i.quantity != null ? String(i.quantity) : '1',
            currency: (i.currency || 'USD') as DuplicateLine['currency'],
            unitPrice: i.unit_price_foreign != null ? String(i.unit_price_foreign) : '',
            weightKg: i.weight_kg != null ? String(i.weight_kg) : '',
            salePriceKrw: i.sale_price_krw != null ? String(i.sale_price_krw) : '',
            imageUrl: i.image_url ?? '',
            forwarderId: i.forwarder_id ?? '',
            customsCategory: i.customs_category ?? '',
          }))
          duplicateSource = {
            marketplace: src.marketplace ?? '',
            forwarderId: src.forwarder_id ?? '',
            forwarderCountry: src.forwarder_country ?? '',
            buyer: {
              buyer_name: src.buyer_name,
              buyer_phone: src.buyer_phone,
              buyer_postal_code: src.buyer_postal_code,
              buyer_address: src.buyer_address,
              buyer_detail_address: src.buyer_detail_address,
              buyer_customs_code: src.buyer_customs_code,
            },
            lines: dupLines,
          }
        }
      }

      // sticky 배대지 — 가장 최근 주문에서 사용한 배대지를 기본값으로
      const { data: lastOrder } = await supabase
        .from('b2b_orders')
        .select('forwarder_id, forwarder_country')
        .eq('account_id', account.id)
        .is('deleted_at', null)
        .not('forwarder_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (lastOrder) {
        lastForwarderId = lastOrder.forwarder_id ?? ''
        lastForwarderCountry = lastOrder.forwarder_country ?? ''
      }

      // 최근 구매자 — 최근 주문에서 이름+전화 기준 중복 제거 후 5명
      const { data: buyerRows } = await supabase
        .from('b2b_orders')
        .select('buyer_name, buyer_phone, buyer_postal_code, buyer_address, buyer_detail_address, buyer_customs_code, created_at')
        .eq('account_id', account.id)
        .is('deleted_at', null)
        .not('buyer_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(40)
      const seen = new Set<string>()
      for (const b of (buyerRows ?? []) as RecentBuyer[]) {
        const key = `${(b.buyer_name ?? '').trim()}|${(b.buyer_phone ?? '').replace(/\D/g, '')}`
        if (key === '|' || seen.has(key)) continue
        seen.add(key)
        recentBuyers.push({
          buyer_name: b.buyer_name,
          buyer_phone: b.buyer_phone,
          buyer_postal_code: b.buyer_postal_code,
          buyer_address: b.buyer_address,
          buyer_detail_address: b.buyer_detail_address,
          buyer_customs_code: b.buyer_customs_code,
        })
        if (recentBuyers.length >= 5) break
      }
      // 마진 손실 SKU — 주문 입력 시 손실 경고 (대시보드 H3 와 동일 계산)
      try {
        const ex = await getExchangeRates()
        const ratesMap: Record<string, { rate: number; unit: number }> = {}
        for (const [k, v] of Object.entries(ex.rates)) ratesMap[k] = { rate: v.rate, unit: v.unit }
        const alerts = await getMarginLossAlerts(account.id, ratesMap)
        for (const a of alerts) lossSkus[a.product_id] = a.loss_per_unit_krw
      } catch {
        // 환율/계산 실패해도 폼은 정상
      }
    }
  }

  return (
    <>
      {nearLimitCards.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 md:px-8 pt-4 md:pt-6">
          <div className="rounded-lg bg-gradient-to-r from-amber-50 to-white border border-amber-200 shadow-sm px-4 py-3">
            <p className="text-sm font-semibold text-amber-800">⚠ 한도 임박 카드 {nearLimitCards.length}장</p>
            <ul className="mt-1.5 space-y-1">
              {nearLimitCards.map((c) => (
                <li key={c.id} className="text-[12px] text-amber-700">
                  <span className="font-medium">{c.alias}</span>
                  {c.last4 && <span className="text-amber-600/70"> ···· {c.last4}</span>} — 이달{' '}
                  {c.used.toLocaleString()}원 / 한도 {c.limit.toLocaleString()}원{' '}
                  <span className={`font-semibold ${c.pct >= 100 ? 'text-rose-600' : 'text-amber-800'}`}>
                    ({c.pct}%{c.pct >= 100 ? ' 초과' : ''})
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-[11px] text-amber-600/80">
              매입 라인에 카드를 매핑하기 전 한도를 확인하세요. {' '}
              <Link href="/settings/cards" className="underline hover:text-amber-800">카드 관리 →</Link>
            </p>
          </div>
        </div>
      )}
      <NewOrderForm
        forwarders={forwarders}
        lossSkus={lossSkus}
        priceHints={priceHints}
        initialForwarderId={lastForwarderId}
        initialForwarderCountry={lastForwarderCountry}
        recentBuyers={recentBuyers}
        duplicateFrom={duplicateSource}
      />
    </>
  )
}
