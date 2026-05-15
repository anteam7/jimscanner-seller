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
    </div>
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
