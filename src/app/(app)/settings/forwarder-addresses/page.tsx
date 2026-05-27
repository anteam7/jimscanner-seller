import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import ForwarderAddressManager from './ForwarderAddressManager'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '배대지 주소 · 짐스캐너 SELLER',
  description: 'amazon 등 매입처 결제 시 자동입력할 배대지 영문 주소.',
  robots: { index: false, follow: false },
}

type ForwarderRef = { name: string | null; slug: string | null }
type AddressRow = {
  id: string
  account_id: string | null
  forwarder_id: string
  label: string
  recipient_name: string
  phone: string | null
  address1: string
  address2: string | null
  city: string
  state: string
  zip: string
  country: string
  member_no: string | null
  is_official: boolean
  is_default: boolean
  notes: string | null
  created_at: string
  forwarders: ForwarderRef | null
}

type ForwarderOption = { id: string; name: string; slug: string }

export default async function ForwarderAddressesPage() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return <div className="p-8 text-sm text-slate-600">로그인이 필요합니다.</div>

  const { data: account } = await sb
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return <div className="p-8 text-sm text-slate-600">사업자 계정이 없습니다.</div>

  const admin = createAdminClient()
  const [{ data: addrRows }, { data: fwdRows }] = await Promise.all([
    admin
      .from('b2b_forwarder_addresses')
      .select(
        'id, account_id, forwarder_id, label, recipient_name, phone, address1, address2, city, state, zip, country, member_no, is_official, is_default, notes, created_at, forwarders(name, slug)',
      )
      .or(`account_id.is.null,account_id.eq.${account.id}`)
      .order('is_default', { ascending: false })
      .order('is_official', { ascending: true })
      .order('label', { ascending: true })
      .returns<AddressRow[]>(),
    admin
      .from('forwarders')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .returns<ForwarderOption[]>(),
  ])

  const addresses = addrRows ?? []
  const forwarders = fwdRows ?? []

  const myCount = addresses.filter((a) => a.account_id != null).length
  const officialCount = addresses.filter((a) => a.is_official).length

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <Link href="/settings" className="text-xs text-slate-500 hover:text-slate-700">← 설정</Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">배대지 주소</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          amazon 등 매입처 결제 시 자동입력에 사용. 짐스캐너 공용 주소(공식)와 본인 등록 주소를 함께 사용할 수 있습니다.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-lg bg-white shadow-sm border-l-[3px] border-l-indigo-500 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">내 주소</p>
          <p className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums">{myCount}건</p>
        </div>
        <div className="rounded-lg bg-white shadow-sm border-l-[3px] border-l-emerald-500 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">공용 주소</p>
          <p className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums">{officialCount}건</p>
        </div>
      </div>

      <ForwarderAddressManager initialAddresses={addresses} forwarders={forwarders} />

      <p className="text-[11px] text-slate-400">
        ※ 회원번호(member_no)는 보통 address2 또는 수신자명 뒤에 합쳐서 입력합니다. 배대지마다 규칙이 다르니
        배대지 안내를 따라 주세요.
      </p>
    </div>
  )
}
