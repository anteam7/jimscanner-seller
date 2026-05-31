import type { Metadata } from 'next'
import { getExchangeRates, toSnapshot } from '@/lib/b2b/exchange-rate'
import MarginSimulator from '@/components/b2b/MarginSimulator'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '마진 시뮬레이터 · 짐스캐너 SELLER',
  description: '매입 전에 매입가·판매가·환율로 순마진을 30초 안에 계산.',
  robots: { index: false, follow: false },
}

export default async function SimulatorPage() {
  const rates = await getExchangeRates()
  const snapshot = toSnapshot(rates)

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          <span className="bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">
            마진 시뮬레이터
          </span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          매입처 화면을 보면서 <span className="font-medium text-slate-800">매입가·판매가·수량</span>만 넣으면
          순마진·마진율·손익분기 판매가를 즉시 계산합니다. 주문을 만들기 전에 &ldquo;이거 사도 남나&rdquo;를 확인하세요.
        </p>
      </header>

      <MarginSimulator snapshot={snapshot} />
    </div>
  )
}
