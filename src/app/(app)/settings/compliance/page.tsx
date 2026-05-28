'use client'

import type { Metadata } from 'next'
import { useCallback, useEffect, useState } from 'react'

export const dynamic = 'force-dynamic'

// Metadata can't be exported from 'use client'; declared separately for reference.
// export const metadata: Metadata = { title: '법규 컴플라이언스 | 짐스캐너 B2B', robots: { index: false } }

const DEFAULT_NOTICE =
  '구매하신 상품을 수령한 날로부터 7일 이내 청약 철회가 가능합니다 (전자상거래법 제17조).'

type ComplianceData = {
  withdrawal_notice_enabled: boolean
  withdrawal_notice_custom_text: string
  stats: { total_30d: number; sent_30d: number; success_rate: number | null }
}

export default function CompliancePage() {
  const [data, setData] = useState<ComplianceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [customText, setCustomText] = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings/compliance')
      if (!res.ok) throw new Error('조회 실패')
      const d: ComplianceData = await res.json()
      setData(d)
      setEnabled(d.withdrawal_notice_enabled)
      if (d.withdrawal_notice_custom_text) {
        setCustomText(d.withdrawal_notice_custom_text)
        setUseCustom(true)
      }
    } catch {
      setSaveMsg({ type: 'error', text: '설정을 불러오지 못했습니다. 새로고침 해주세요.' })
    } finally {
      setLoading(false)
    }
  }, [])

  // mount 1회 compliance 설정 fetch. cascading render 없음.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  async function handleSave() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const body: Record<string, unknown> = { withdrawal_notice_enabled: enabled }
      if (useCustom && customText.trim()) {
        body.withdrawal_notice_custom_text = customText.trim()
      } else {
        body.withdrawal_notice_custom_text = null
      }

      const res = await fetch('/api/settings/compliance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error ?? '저장 실패')
      }
      setSaveMsg({ type: 'success', text: '설정이 저장되었습니다.' })
      load()
    } catch (e) {
      setSaveMsg({ type: 'error', text: e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">법규 컴플라이언스</h1>
        <p className="text-sm text-slate-400 mt-0.5">전자상거래법 의무 고지 및 법정 문서 설정을 관리합니다.</p>
      </div>

      {/* 청약철회 고지 섹션 */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">청약철회 권리 자동 고지</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              주문이 <strong className="text-slate-500">완료</strong> 상태로 전환될 때 의뢰자에게 청약철회 안내를 자동 발송합니다.
              <br />
              <span className="text-amber-600">전자상거래법 제17조</span>에 따라 통신판매업자는 소비자에게 청약철회 권리를 의무 고지해야 합니다.
            </p>
          </div>
          {loading ? (
            <div className="w-12 h-6 rounded-full bg-slate-300 animate-pulse flex-shrink-0" />
          ) : (
            <button
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled((v) => !v)}
              className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                enabled ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
              <span className="sr-only">{enabled ? '켜짐' : '꺼짐'}</span>
            </button>
          )}
        </div>

        {/* 법정 기본 문구 */}
        <div className="rounded-lg bg-slate-100 border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-400 mb-1">법정 기본 문구 (미설정 시 자동 사용)</p>
          <p className="text-sm text-slate-500 leading-relaxed">{DEFAULT_NOTICE}</p>
        </div>

        {/* 커스텀 문구 */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useCustom}
              onChange={(e) => setUseCustom(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-100 text-indigo-500 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-500">커스텀 문구 사용</span>
          </label>
          {useCustom && (
            <div>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder={DEFAULT_NOTICE}
                aria-label="커스텀 청약철회 문구"
                className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
              <p className={`text-xs mt-1 text-right ${customText.length >= 500 ? 'text-red-600' : 'text-slate-400'}`}>
                {customText.length}/500
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                법정 의무 고지 내용은 반드시 포함되어야 합니다. 삭제 시 기본 문구가 사용됩니다.
              </p>
            </div>
          )}
        </div>

        {/* 저장 버튼 */}
        <div className="flex items-center justify-between gap-4 pt-1">
          {saveMsg ? (
            <p className={`text-sm ${saveMsg.type === 'success' ? 'text-emerald-400' : 'text-red-600'}`}>
              {saveMsg.text}
            </p>
          ) : (
            <span />
          )}
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            {saving ? '저장 중…' : '설정 저장'}
          </button>
        </div>
      </section>

      {/* 최근 30일 발송 현황 */}
      {data && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">최근 30일 발송 현황</h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="총 발송 시도" value={data.stats.total_30d.toString()} />
            <StatCard label="발송 성공" value={data.stats.sent_30d.toString()} />
            <StatCard
              label="성공률"
              value={data.stats.success_rate !== null ? `${data.stats.success_rate}%` : '—'}
              cls={
                data.stats.success_rate !== null && data.stats.success_rate < 80
                  ? 'text-amber-600'
                  : 'text-emerald-400'
              }
            />
          </div>
          {data.stats.total_30d === 0 && (
            <p className="text-xs text-slate-400 bg-white border border-slate-200 rounded-lg p-3">
              아직 청약철회 고지가 발송된 내역이 없습니다. 주문 상태를 <strong className="text-slate-500">완료</strong>로
              전환하면 의뢰자에게 자동 발송됩니다.
            </p>
          )}
        </section>
      )}

      {/* 부가세 자료 CSV 다운로드 */}
      <TaxCsvExportSection />
    </div>
  )
}

function TaxCsvExportSection() {
  const now = new Date()
  const thisMonth = now.toISOString().slice(0, 7) // YYYY-MM
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`

  function rangeFor(ym: string): { from: string; to: string } {
    const [y, m] = ym.split('-').map(Number)
    const first = new Date(y, m - 1, 1)
    const last = new Date(y, m, 0)
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return { from: fmt(first), to: fmt(last) }
  }

  function downloadUrl(ym: string): string {
    const r = rangeFor(ym)
    return `/api/orders/export-csv?from=${r.from}&to=${r.to}`
  }

  // 분기·연간 자료
  const currentYear = now.getFullYear()
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1
  function quarterRange(year: number, q: number): { from: string; to: string; label: string } {
    const startMonth = (q - 1) * 3
    const first = new Date(year, startMonth, 1)
    const last = new Date(year, startMonth + 3, 0)
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return { from: fmt(first), to: fmt(last), label: `${year}년 ${q}분기` }
  }
  function yearRange(year: number): { from: string; to: string; label: string } {
    return { from: `${year}-01-01`, to: `${year}-12-31`, label: `${year}년 전체` }
  }
  function downloadUrlRange(r: { from: string; to: string }): string {
    return `/api/orders/export-csv?from=${r.from}&to=${r.to}`
  }
  const thisQuarter = quarterRange(currentYear, currentQuarter)
  const lastQuarter = currentQuarter === 1
    ? quarterRange(currentYear - 1, 4)
    : quarterRange(currentYear, currentQuarter - 1)
  const thisYear = yearRange(currentYear)
  const lastYear = yearRange(currentYear - 1)

  return (
    <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-emerald-500 bg-gradient-to-br from-emerald-50/30 to-white shadow-sm p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">부가세·회계 자료 (CSV)</h2>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
          주문 데이터를 CSV 로 다운로드합니다. 한국수출입은행 환율로 KRW 환산·라인별 마진 포함.
          엑셀에서 바로 열 수 있도록 UTF-8 BOM 포함.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href={downloadUrl(thisMonth)}
          className="group inline-flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors"
        >
          <div>
            <p className="text-xs text-slate-500">이번 달</p>
            <p className="text-sm font-semibold text-slate-900">{thisMonth} 자료</p>
          </div>
          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </a>
        <a
          href={downloadUrl(lastMonth)}
          className="group inline-flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors"
        >
          <div>
            <p className="text-xs text-slate-500">지난 달</p>
            <p className="text-sm font-semibold text-slate-900">{lastMonth} 자료</p>
          </div>
          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </a>
      </div>
      <div className="border-t border-slate-100 pt-3">
        <p className="text-xs font-semibold text-slate-700 mb-2">분기·연간 자료</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[thisQuarter, lastQuarter, thisYear, lastYear].map((r) => (
            <a key={r.label} href={downloadUrlRange(r)}
              className="inline-flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors">
              <div>
                <p className="text-[10px] text-slate-500">{r.label}</p>
                <p className="text-[11px] font-semibold text-slate-900">{r.from.slice(5)} ~ {r.to.slice(5)}</p>
              </div>
              <svg className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </a>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-slate-500">
        20 컬럼: 주문일·마켓·셀러번호·구매자 PII·통관코드·상품·매입가·환율 환산 KRW·판매가·마진.
        부가세 신고용 보조 자료로 사용 가능 (홈택스 직접 업로드 양식은 v0.5 예정).
      </p>
    </section>
  )
}

function StatCard({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 text-center">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${cls ?? 'text-slate-900'}`}>{value}</p>
    </div>
  )
}
