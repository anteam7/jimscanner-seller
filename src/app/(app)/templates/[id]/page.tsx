import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/auth/admin-supabase'
import TemplateMappingEditor, {
  type EditorColumn,
  type EditorForwarder,
  type SampleAccount,
  type SampleOrder,
} from '@/components/b2b/TemplateMappingEditor'

export const metadata: Metadata = {
  title: '양식 매핑 편집',
  robots: { index: false },
}

export const dynamic = 'force-dynamic'

type TplRow = {
  id: string
  owner_account_id: string | null
  forwarder_id: string | null
  name: string
  source_file_path: string
  data_sheet_name: string
  data_start_row: number
  combine_rule: string | null
  is_active: boolean
  forwarders: { name: string; slug: string } | null
}

export default async function TemplateEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound()
  }

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

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adb = admin as any

  const { data: tpl } = (await adb
    .from('b2b_form_templates')
    .select('id, owner_account_id, forwarder_id, name, source_file_path, data_sheet_name, data_start_row, combine_rule, is_active, forwarders(name, slug)')
    .eq('id', id)
    .maybeSingle()) as { data: TplRow | null }

  if (!tpl) notFound()

  // 본인 소유만 편집 가능 — 공유 템플릿은 /templates 로 리다이렉트
  if (tpl.owner_account_id == null) {
    redirect('/templates')
  }
  if (tpl.owner_account_id !== account.id) {
    redirect('/templates')
  }

  const { data: colRows } = await adb
    .from('b2b_form_template_columns')
    .select('column_index, column_letter, column_label, source_kind, source_path, composite_template, constant_value, user_input_label, user_input_options, transform, required')
    .eq('template_id', id)
    .order('column_index', { ascending: true })

  const columns = (colRows ?? []) as EditorColumn[]

  const { data: fwdRows } = await adb
    .from('forwarders')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })
  const forwarders = (fwdRows ?? []) as EditorForwarder[]

  // 미리보기용 — 가장 최근 주문 1건 + 첫 라인
  const { data: sampleOrderRows } = await db
    .from('b2b_orders')
    .select(
      'id, order_number, marketplace, market_order_number, buyer_name, buyer_phone, buyer_postal_code, buyer_address, buyer_detail_address, buyer_customs_code, request_notes, forwarder_country, forwarder_request_no, b2b_order_items(display_order, product_name, product_url, quantity, currency, unit_price_foreign, total_price_foreign, weight_kg, supplier_site, supplier_order_number, market_product_id, market_option, tracking_number)',
    )
    .eq('account_id', account.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
  const sampleOrder: SampleOrder | null =
    (sampleOrderRows && sampleOrderRows[0]) ? (sampleOrderRows[0] as SampleOrder) : null

  // account 메타
  const { data: accountFull } = await adb
    .from('b2b_accounts')
    .select('id, business_name, phone')
    .eq('id', account.id)
    .single()
  const sampleAccount: SampleAccount = {
    business_name: accountFull?.business_name ?? null,
    phone: accountFull?.phone ?? null,
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div className="flex items-start gap-3">
        <Link
          href="/templates"
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors mt-1"
          aria-label="양식 목록으로"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight truncate">{tpl.name}</h1>
          <p className="text-sm text-slate-600 mt-1">
            시트 “{tpl.data_sheet_name}” · 데이터 시작 행 {tpl.data_start_row}
            {tpl.forwarders?.name && (
              <span className="ml-2 inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                {tpl.forwarders.name}
              </span>
            )}
          </p>
        </div>
      </div>

      <TemplateMappingEditor
        templateId={tpl.id}
        templateName={tpl.name}
        forwarderId={tpl.forwarder_id}
        forwarders={forwarders}
        initialColumns={columns}
        sampleOrder={sampleOrder}
        sampleAccount={sampleAccount}
      />
    </div>
  )
}
