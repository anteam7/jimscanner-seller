import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '배대지 배송신청서 캡쳐 · 짐스캐너 SELLER',
  description: '확장으로 수집한 배대지 배송신청서 HTML 스냅샷.',
  robots: { index: false, follow: false },
}

type Snapshot = {
  id: string
  forwarder_id: string | null
  forwarder_slug: string | null
  url: string
  page_title: string | null
  user_note: string | null
  created_at: string
  fields: unknown
}

export default async function ForwarderFormsPage() {
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

  const { data: snapshotsRaw } = await sb
    .from('b2b_forwarder_form_snapshots')
    .select('id, forwarder_id, forwarder_slug, url, page_title, user_note, created_at, fields, forwarders(name, slug)')
    .eq('account_id', account.id)
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<(Snapshot & { forwarders?: { name: string; slug: string } | null })[]>()

  const snapshots = snapshotsRaw ?? []

  // 배대지별 그룹핑 카운트
  const byForwarder = new Map<string, number>()
  for (const s of snapshots) {
    const key = s.forwarders?.name ?? s.forwarder_slug ?? '미식별'
    byForwarder.set(key, (byForwarder.get(key) ?? 0) + 1)
  }
  const uniqForwarders = byForwarder.size

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">
            배송신청서 HTML 캡쳐
          </span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          각 배대지 사이트에서 배송신청서 페이지에 진입하면 우하단 [📋 캡쳐] 버튼이 뜹니다. 클릭하면
          form 구조가 여기로 업로드되고, 짐스캐너 팀이 자동입력 매핑을 작성합니다.
        </p>
      </header>

      {/* 가이드 박스 */}
      <div className="rounded-lg bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 px-5 py-4 shadow-sm">
        <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">사용 방법</p>
        <ol className="text-[13px] text-slate-700 space-y-1.5 leading-relaxed">
          <li><b>1.</b> 짐스캐너 확장이 설치되어 있고 <Link href="/settings/extension" className="text-indigo-700 hover:underline font-semibold">/settings/extension</Link> 에서 토큰이 저장된 상태인지 확인</li>
          <li><b>2.</b> 본인 계정으로 배대지 사이트에 로그인 (별도 가입 필요)</li>
          <li><b>3.</b> 배송신청서 / 발송신청 페이지로 이동 → 입력 폼이 보이면 우하단에 보라색 <b>[📋 배송신청서 HTML 캡쳐]</b> 버튼 자동 표시</li>
          <li><b>4.</b> 버튼 클릭 → 미리보기 패널에서 [짐스캐너로 전송] 클릭</li>
          <li><b>5.</b> 다음 단계 (상품 정보 / 결제 등) 페이지도 같은 방식으로 캡쳐</li>
        </ol>
        <p className="mt-3 text-[11px] text-slate-500">
          ※ 입력값(value) 은 보내지 않습니다 — name/id/label/placeholder/타입만 추출. 개인정보 안전.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg bg-white shadow-sm border-l-[3px] border-l-indigo-500 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">캡쳐 수</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{snapshots.length.toLocaleString('ko-KR')}건</p>
        </div>
        <div className="rounded-lg bg-white shadow-sm border-l-[3px] border-l-emerald-500 px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">커버한 배대지</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{uniqForwarders.toLocaleString('ko-KR')}곳</p>
          <p className="mt-0.5 text-[11px] text-emerald-700">총 30곳 활성 중</p>
        </div>
      </div>

      <div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden">
        {snapshots.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl mb-3">📋</div>
            <p className="text-sm font-semibold text-slate-700">아직 캡쳐된 스냅샷이 없습니다.</p>
            <p className="mt-1 text-xs text-slate-500">위 가이드를 따라 배대지 사이트에서 [📋] 버튼을 눌러 보세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-semibold">
                <tr>
                  <th className="px-4 py-2.5 text-left">배대지</th>
                  <th className="px-4 py-2.5 text-left">페이지</th>
                  <th className="px-4 py-2.5 text-left">메모</th>
                  <th className="px-4 py-2.5 text-right">필드</th>
                  <th className="px-4 py-2.5 text-left">캡쳐 시각</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {snapshots.map((s) => {
                  const fieldCount = Array.isArray(s.fields) ? s.fields.length : 0
                  const d = new Date(s.created_at)
                  const ts =
                    String(d.getFullYear()).slice(2) +
                    '.' +
                    String(d.getMonth() + 1).padStart(2, '0') +
                    '.' +
                    String(d.getDate()).padStart(2, '0') +
                    ' ' +
                    String(d.getHours()).padStart(2, '0') +
                    ':' +
                    String(d.getMinutes()).padStart(2, '0')
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded">
                          {s.forwarders?.name ?? s.forwarder_slug ?? '미식별'}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[400px]">
                        <p className="text-slate-900 truncate font-medium">{s.page_title || '제목 없음'}</p>
                        <p className="text-[11px] text-slate-500 truncate font-mono">{s.url}</p>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-600 max-w-[200px] truncate">
                        {s.user_note ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-900 font-semibold">{fieldCount}</td>
                      <td className="px-4 py-3 text-[11px] text-slate-600 tabular-nums">{ts}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400">
        ※ 자동입력 selector 매핑은 짐스캐너 팀이 수동으로 작성 후 다음 확장 버전 (0.3+) 에 포함됩니다.
        진행 상황은 별도 안내 드립니다.
      </p>
    </div>
  )
}
