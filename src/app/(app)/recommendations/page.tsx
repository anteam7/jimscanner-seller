import type { Metadata } from 'next'
import { getExchangeRates } from '@/lib/b2b/exchange-rate'
import { RECOMMENDED_PRODUCTS, type RecommendedProduct } from '@/lib/b2b/recommended-products'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '추천 상품 · 짐스캐너 SELLER',
  description: '일본·미국 해외 직구 셀러를 위한 트렌딩 상품 추천과 마진 시뮬레이션.',
  robots: { index: false, follow: false },
}

function formatKRW(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`
}

function formatForeign(amount: number, currency: 'USD' | 'JPY'): string {
  if (currency === 'JPY') return `¥${amount.toLocaleString('ko-KR')}`
  return `$${amount.toFixed(2)}`
}

function calcKrwCost(
  p: RecommendedProduct,
  rates: Record<string, { rate: number; unit: number }>,
): number | null {
  const r = rates[p.currency]
  if (!r) return null
  return Math.round((p.cost_foreign * r.rate) / (r.unit || 1))
}

export default async function RecommendationsPage() {
  let rates: Record<string, { rate: number; unit: number }> = {}
  let isFallback = false
  try {
    const r = await getExchangeRates()
    for (const [k, v] of Object.entries(r.rates)) rates[k] = { rate: v.rate, unit: v.unit }
    isFallback = r.isFallback
  } catch {
    rates = {}
  }

  const jpItems = RECOMMENDED_PRODUCTS.filter((p) => p.origin === 'JP')
  const usItems = RECOMMENDED_PRODUCTS.filter((p) => p.origin === 'US')

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">추천 상품</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          국내 마켓에서 잘 팔리는 일본·미국 직구 카테고리. 현재 환율을 적용한 매입가·예상 마진을 함께 확인하세요.
        </p>
        {isFallback && (
          <p className="mt-1 text-[11px] text-amber-700">⚠ 환율 캐시 (한국수출입은행 API 일시 지연)</p>
        )}
      </header>

      <Section title="🇯🇵 일본 트렌딩" subtitle="라쿠텐 / 아마존 JP" items={jpItems} rates={rates} />
      <Section title="🇺🇸 미국 트렌딩" subtitle="아마존 US" items={usItems} rates={rates} />

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 text-[11px] text-slate-500 space-y-1">
        <p>※ 매입가 / 예상 판매가는 2026-05 평균 추정치입니다. 실제 매입처 가격과 마켓 시세는 시점에 따라 다릅니다.</p>
        <p>※ 예상 마진은 매입가 환산 + 평균 배대지 배송비 6,000원만 반영한 단순 계산이며, 관세·결제 수수료·마케팅 비용은 별도입니다.</p>
        <p>※ 어필리에이트 링크는 v0.5 에서 실 ID 연동 예정. 현재는 카테고리·시즌성·통관 메모만 참고용으로 제공합니다.</p>
      </div>
    </div>
  )
}

function Section({
  title,
  subtitle,
  items,
  rates,
}: {
  title: string
  subtitle: string
  items: RecommendedProduct[]
  rates: Record<string, { rate: number; unit: number }>
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="text-[11px] text-slate-500">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((p) => {
          const krwCost = calcKrwCost(p, rates)
          const shippingEst = 6000
          const totalCost = krwCost != null ? krwCost + shippingEst : null
          const margin = totalCost != null ? p.estimated_sale_krw - totalCost : null
          const marginRate = totalCost != null && totalCost > 0 ? Math.round((margin! / p.estimated_sale_krw) * 1000) / 10 : null

          const marginCls =
            marginRate == null
              ? 'text-slate-500'
              : marginRate < 0
                ? 'text-rose-700'
                : marginRate < 10
                  ? 'text-amber-700'
                  : marginRate < 30
                    ? 'text-emerald-700'
                    : 'text-emerald-800 font-bold'

          return (
            <article
              key={p.id}
              className="rounded-lg bg-white shadow-sm border border-slate-200 hover:shadow-md transition-all overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-slate-100 flex items-start gap-3">
                <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center text-2xl leading-none shrink-0">
                  {p.thumb}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{p.category}</p>
                  <p className="text-sm font-semibold text-slate-900 leading-tight mt-0.5">{p.name}</p>
                </div>
              </div>

              <dl className="px-4 py-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">매입처</dt>
                  <dd className="font-medium text-slate-700">{p.supplier_label}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">현지 가격</dt>
                  <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                    {formatForeign(p.cost_foreign, p.currency)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">KRW 환산</dt>
                  <dd className="font-semibold text-indigo-700 tabular-nums">
                    {krwCost != null ? formatKRW(krwCost) : '환율 없음'}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">예상 판매가</dt>
                  <dd className="font-semibold text-slate-900 tabular-nums">{formatKRW(p.estimated_sale_krw)}</dd>
                </div>
              </dl>

              {marginRate != null && (
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">예상 마진</span>
                  <span className={`font-bold tabular-nums ${marginCls}`}>
                    {margin! >= 0 ? '+' : ''}
                    {formatKRW(margin!)} ({marginRate}%)
                  </span>
                </div>
              )}

              {p.notes && (
                <p className="px-4 py-2 text-[10px] text-slate-500 border-t border-slate-100 leading-relaxed">
                  💡 {p.notes}
                </p>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
