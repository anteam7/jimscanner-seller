import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import TemplateUploadModal from '@/components/b2b/TemplateUploadModal'

export const metadata: Metadata = {
  title: '배대지 양식',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

type TemplateRow = {
  id: string
  name: string
  owner_account_id: string | null
  forwarder_id: string | null
  data_sheet_name: string
  data_start_row: number
  source_file_size: number | null
  is_active: boolean
  created_at: string
  forwarders: { name: string; slug: string } | null
}

type Forwarder = { id: string; name: string }

function formatDateTime(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatSize(b: number | null): string {
  if (b == null) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}

export default async function TemplatesPage() {
  const sb = await createClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = sb as any
  const { data: account } = await db
    .from('b2b_accounts')
    .select('id, business_name')
    .eq('user_id', user.id)
    .single()
  if (!account) return null

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adb = admin as any

  // 양식 목록 (공유 + 본인)
  const { data: rows } = await adb
    .from('b2b_form_templates')
    .select('id, name, owner_account_id, forwarder_id, data_sheet_name, data_start_row, source_file_size, is_active, created_at, forwarders(name, slug)')
    .or(`owner_account_id.is.null,owner_account_id.eq.${account.id}`)
    .order('owner_account_id', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false })

  const templates = (rows ?? []) as TemplateRow[]
  const shared = templates.filter((t) => t.owner_account_id == null)
  const mine = templates.filter((t) => t.owner_account_id === account.id)

  // 배대지 목록 (업로드 시 dropdown)
  const { data: fwdRows } = await adb
    .from('forwarders')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })
  const forwarders = (fwdRows ?? []) as Forwarder[]

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">배대지 양식</h1>
          <p className="text-sm text-slate-600 mt-1">
            주문을 양식 xlsx 로 변환할 때 사용할 템플릿을 관리합니다. 공식 양식이 없는 배대지는 직접 양식을 업로드해서 등록하세요.
          </p>
        </div>
        <TemplateUploadModal forwarders={forwarders} />
      </div>

      {/* 공유 템플릿 */}
      <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-indigo-500 bg-gradient-to-br from-indigo-50/30 to-white shadow-sm p-6">
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold text-slate-900">공유 템플릿</h2>
          <span className="text-xs text-slate-500">짐스캐너가 제공하는 공식 양식 · 전 셀러 사용 가능</span>
        </div>
        {shared.length === 0 ? (
          <p className="text-sm text-slate-500">아직 공유 템플릿이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {shared.map((t) => (
              <li key={t.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">
                    {t.name}
                    {t.forwarders?.name && (
                      <span className="ml-2 inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                        {t.forwarders.name}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    시트 “{t.data_sheet_name}” · {formatSize(t.source_file_size)} · 데이터 시작 행 {t.data_start_row}
                  </p>
                </div>
                <span className="text-[11px] text-slate-500 bg-white border border-slate-200 rounded px-2 py-0.5">읽기 전용</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 내 양식 */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold text-slate-900">
            내 양식 <span className="text-slate-500 font-normal">({mine.length})</span>
          </h2>
          <span className="text-xs text-slate-500">셀러 본인이 업로드한 양식</span>
        </div>
        {mine.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500 mb-3">
              아직 업로드한 양식이 없습니다. 배대지에서 제공하는 xlsx/xls 양식을 업로드하면 매핑 후 주문 변환에 사용할 수 있습니다.
            </p>
            <TemplateUploadModal forwarders={forwarders} compact />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {mine.map((t) => (
              <li key={t.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/templates/${t.id}`}
                    className="font-medium text-indigo-700 hover:text-indigo-800 truncate block"
                  >
                    {t.name}
                  </Link>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t.forwarders?.name ? <span className="text-slate-700 mr-2">{t.forwarders.name}</span> : null}
                    시트 “{t.data_sheet_name}” · {formatSize(t.source_file_size)} · 등록 {formatDateTime(t.created_at)}
                  </p>
                </div>
                <Link
                  href={`/templates/${t.id}`}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-100"
                >
                  매핑 편집 →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
