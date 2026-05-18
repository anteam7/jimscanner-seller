import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '매입 영수증 · 짐스캐너 SELLER',
  description: '브라우저 확장이 수집한 해외 매입처 주문 영수증.',
  robots: { index: false, follow: false },
}

const SOURCE_LABEL: Record<string, string> = {
  amazon_us: '아마존 US',
  amazon_jp: '아마존 JP',
  rakuten: '라쿠텐',
  yahoo: '야후',
}

type Item = {
  name: string | null
  qty?: number
  unit_price?: number | null
  asin?: string | null
  image_url?: string | null
  product_url?: string | null
}

type Row = {
  id: string
  source: string
  supplier_order_number: string
  purchased_at: string | null
  currency: string | null
  total_foreign: number | string | null
  items: Item[] | null
  source_url: string | null
  matched_order_id: string | null
  matched_at: string | null
  created_at: string
}

function formatForeign(v: number | string | null | undefined, currency: string | null): string {
  if (v == null) return '—'
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return '—'
  if (currency === 'JPY') return `¥${n.toLocaleString('ko-KR')}`
  if (currency === 'USD') return `$${n.toFixed(2)}`
  return `${n.toLocaleString('ko-KR')} ${currency ?? ''}`.trim()
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}

export default async function ImportsPage() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return <div className="p-8 text-sm text-slate-600">로그인이 필요합니다.</div>

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!account) return <div className="p-8 text-sm text-slate-600">사업자 계정이 없습니다.</div>

  const { data: rowsRaw } = await db
    .from('b2b_supplier_purchases')
    .select(
      'id, source, supplier_order_number, purchased_at, currency, total_foreign, items, source_url, matched_order_id, matched_at, created_at',
    )
    .eq('account_id', account.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const rows = (rowsRaw ?? []) as Row[]
  const total = rows.length
  const unmatched = rows.filter((r) => !r.matched_order_id).length

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">매입 영수증</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          브라우저 확장이 수집한 해외 매입처 주문. 한국 마켓 주문과 매칭하면 짐스캐너 처리 흐름에 연결됩니다.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg bg-white shadow-sm border-l-[3px] border-l-indigo-500 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">전체 수집</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{total.toLocaleString('ko-KR')}건</p>
        </div>
        <div className="rounded-lg bg-white shadow-sm border-l-[3px] border-l-amber-500 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">매칭 대기</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{unmatched.toLocaleString('ko-KR')}건</p>
          <p className="mt-0.5 text-[11px] text-amber-700">한국 마켓 주문과 연결 필요</p>
        </div>
      </div>

      <div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden">
        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl mb-3">
              📦
            </div>
            <p className="text-sm font-semibold text-slate-700">아직 수집된 영수증이 없습니다.</p>
            <p className="mt-1 text-xs text-slate-500">
              <Link href="/settings/extension" className="text-indigo-700 hover:underline font-semibold underline-offset-2">
                /settings/extension
              </Link>{' '}
              에서 확장 토큰을 발급하고 아마존 주문 페이지에서 가져오기를 시도해 보세요.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-semibold">
                <tr>
                  <th className="px-4 py-2.5 text-left">매입처</th>
                  <th className="px-4 py-2.5 text-left">주문번호</th>
                  <th className="px-4 py-2.5 text-left">상품</th>
                  <th className="px-4 py-2.5 text-right">합계</th>
                  <th className="px-4 py-2.5 text-left">매입일</th>
                  <th className="px-4 py-2.5 text-left">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const first = r.items?.[0]
                  const moreCount = (r.items?.length ?? 0) - 1
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded">
                          {SOURCE_LABEL[r.source] ?? r.source}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/imports/${r.id}`}
                          className="font-mono text-[11px] text-indigo-700 hover:text-indigo-800 hover:underline underline-offset-2"
                          title="짐스캐너에서 영수증 상세 보기"
                        >
                          {r.supplier_order_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {first ? (
                          <div>
                            <p className="text-slate-900 truncate max-w-[320px]">{first.name}</p>
                            {moreCount > 0 && (
                              <p className="text-[11px] text-slate-500 mt-0.5">외 {moreCount}건</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">상품 없음</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">
                        {formatForeign(r.total_foreign, r.currency)}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-600 tabular-nums">
                        {formatDate(r.purchased_at ?? r.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {r.matched_order_id ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded">
                            매칭됨
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded">
                            대기
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400">
        ※ 매칭 UI (한국 마켓 주문과 연결) 는 다음 단계로 작업 예정입니다. 현재는 영수증 수집 검증 목적의 목록 표시.
      </p>
    </div>
  )
}
