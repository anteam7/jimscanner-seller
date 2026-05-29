import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'
import TransitOverrideEditor from '@/components/b2b/TransitOverrideEditor'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '운송일수 보정 · 짐스캐너 SELLER',
  robots: { index: false, follow: false },
}

type DefaultRow = {
  origin_country: string
  method: string
  avg_transit_days: number
  min_transit_days: number | null
  max_transit_days: number | null
}

type OverrideRow = {
  origin_country: string
  method: string
  avg_transit_days: number
}

export default async function TransitSettingsPage() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    return <div className="p-8"><p className="text-sm text-slate-600">로그인이 필요합니다.</p></div>
  }
  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) {
    return <div className="p-8"><p className="text-sm text-slate-600">사업자 계정이 없습니다.</p></div>
  }

  const [{ data: defaultsRaw }, { data: overridesRaw }] = await Promise.all([
    sb
      .from('b2b_forwarder_transit_defaults')
      .select('origin_country, method, avg_transit_days, min_transit_days, max_transit_days')
      .eq('is_active', true),
    sb
      .from('b2b_seller_transit_overrides')
      .select('origin_country, method, avg_transit_days')
      .eq('account_id', account.id),
  ])

  const defaults = (defaultsRaw ?? []) as DefaultRow[]
  const overrides = (overridesRaw ?? []) as OverrideRow[]

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <Link href="/settings" className="text-xs text-slate-500 hover:text-indigo-700 transition-colors">
          ← 설정
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          <span className="bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">
            운송일수 보정
          </span>
        </h1>
        <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">
          국가·운송수단별 평균 운송일수는 서비스 공통 시드값을 씁니다. 실제 경험상 더 빠르거나 느린
          배대지를 쓴다면 본인 기준으로 보정하세요. 보정한 값은{' '}
          <Link href="/eta" className="underline hover:text-indigo-700">도착 예정(ETA)</Link>{' '}
          계산과 캘린더 export 에 우선 적용됩니다.
        </p>
      </div>

      <TransitOverrideEditor defaults={defaults} initialOverrides={overrides} />

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed">
        <p className="font-semibold text-slate-700 mb-1">동작 방식</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>보정값을 저장하면 그 국가·운송수단의 ETA 계산에 시드값 대신 내 값이 쓰입니다.</li>
          <li><strong>초기화</strong> 하면 다시 글로벌 시드값으로 돌아갑니다.</li>
          <li>현재 ETA 계산은 항공(air) 운송을 기준으로 합니다.</li>
        </ul>
      </div>
    </div>
  )
}
