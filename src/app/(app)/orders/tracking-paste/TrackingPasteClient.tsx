'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const OVERSEAS_CARRIERS: Array<{ value: string; label: string }> = [
  { value: '', label: '미지정' },
  { value: 'dhl', label: 'DHL' },
  { value: 'ups', label: 'UPS' },
  { value: 'usps', label: 'USPS' },
  { value: 'fedex', label: 'FedEx' },
  { value: 'ems', label: 'EMS' },
  { value: 'yamato', label: 'Yamato' },
  { value: 'sagawa', label: 'Sagawa' },
  { value: 'japan-post', label: 'Japan Post' },
  { value: 'sf-express', label: 'SF Express' },
  { value: 'ems-china', label: 'EMS China' },
  { value: 'china-post', label: 'China Post' },
  { value: 'royal-mail', label: 'Royal Mail' },
  { value: 'dpd', label: 'DPD' },
  { value: 'other', label: '기타' },
]

const CARRIER_ALIASES: Record<string, string> = {
  dhl: 'dhl', ups: 'ups', usps: 'usps', fedex: 'fedex', ems: 'ems',
  yamato: 'yamato', ヤマト: 'yamato', '구로네코': 'yamato', '구로네꼬': 'yamato',
  sagawa: 'sagawa', 佐川: 'sagawa',
  'japan-post': 'japan-post', japanpost: 'japan-post', 'jp-post': 'japan-post', '일본우체국': 'japan-post', 일본우편: 'japan-post',
  'sf-express': 'sf-express', sf: 'sf-express', 顺丰: 'sf-express', '순펑': 'sf-express',
  'ems-china': 'ems-china', emschina: 'ems-china',
  'china-post': 'china-post', chinapost: 'china-post', 중국우편: 'china-post',
  'royal-mail': 'royal-mail', royalmail: 'royal-mail', '영국우편': 'royal-mail',
  dpd: 'dpd', other: 'other',
}

function detectCarrier(raw: string | null | undefined): string {
  if (!raw) return ''
  const k = raw.trim().toLowerCase().replace(/\s+/g, '-')
  return CARRIER_ALIASES[k] ?? ''
}

type ParsedRow = {
  raw: string
  key: string
  tracking: string
  carrier: string
}

type ResultUpdated = {
  key: string
  item_id: string
  order_id: string
  order_number: string
  status_transitioned: boolean
}

type ApiResponse = {
  matched?: number
  skipped_no_match?: string[]
  skipped_invalid?: string[]
  updated?: ResultUpdated[]
  error?: string
}

function parsePaste(text: string): { rows: ParsedRow[]; invalid: string[] } {
  const rows: ParsedRow[] = []
  const invalid: string[] = []
  const lines = text.split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    // 탭 → 쉼표 → 다중 공백 순서로 시도
    let parts: string[]
    if (line.includes('\t')) parts = line.split('\t')
    else if (/,/.test(line)) parts = line.split(',')
    else parts = line.split(/\s{2,}|\s+\|\s+|\s+→\s+|\s+/)
    parts = parts.map((p) => p.trim()).filter((p) => p.length > 0)
    if (parts.length < 2) {
      invalid.push(line)
      continue
    }
    const [key, tracking, carrierRaw] = parts
    rows.push({
      raw: line,
      key,
      tracking,
      carrier: detectCarrier(carrierRaw),
    })
  }
  return { rows, invalid }
}

export default function TrackingPasteClient() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [defaultCarrier, setDefaultCarrier] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { rows, invalid } = useMemo(() => parsePaste(text), [text])

  async function submit() {
    if (rows.length === 0) {
      setError('유효한 입력 행이 없습니다.')
      return
    }
    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      const payload = {
        rows: rows.map((r) => ({
          key: r.key,
          tracking_number_overseas: r.tracking,
          carrier: r.carrier || defaultCarrier || null,
        })),
      }
      const res = await fetch('/api/orders/tracking-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = (await res.json().catch(() => ({}))) as ApiResponse
      if (!res.ok) {
        setError(json.error ?? '서버 오류')
        return
      }
      setResult(json)
      router.refresh()
    } catch {
      setError('네트워크 오류')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setText('')
    setResult(null)
    setError(null)
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Link
            href="/orders"
            className="text-xs text-slate-500 hover:text-slate-900"
            aria-label="주문 목록으로"
          >
            ← 주문 목록
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">운송장 일괄 입력</h1>
        <p className="text-sm text-slate-600 mt-1">
          매입처에서 받은 운송장 목록을 한 번에 매핑합니다. 라인의 매입 주문번호 (또는 셀러 주문번호) 를 키로 사용합니다.
        </p>
      </div>

      {/* 사용 안내 */}
      <section className="rounded-xl border border-slate-200 border-l-[3px] border-l-indigo-500 bg-gradient-to-br from-indigo-50/40 to-white shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">입력 형식</h2>
        <ul className="text-xs text-slate-700 space-y-1 leading-relaxed">
          <li>• 한 줄에 1건. <b>키 (매입 주문번호 또는 셀러 주문번호) ⇥ 운송장번호 ⇥ 캐리어(선택)</b></li>
          <li>• 구분자는 <code className="px-1 py-0.5 bg-slate-100 rounded">탭</code> · <code className="px-1 py-0.5 bg-slate-100 rounded">쉼표</code> · 다중 공백 모두 인식</li>
          <li>• 캐리어를 비워두면 페이지 상단 &quot;기본 캐리어&quot; 가 적용됩니다.</li>
          <li>• 매입 주문번호가 우선 매칭됩니다. 키가 셀러 주문번호이면 해당 주문의 모든 라인에 적용됩니다.</li>
        </ul>
        <pre className="bg-slate-900 text-slate-100 text-[11px] rounded-md p-3 font-mono overflow-x-auto leading-snug">
{`112-7891234-5678901\t9405511299223123456789\tusps
112-7000000-0000000\t1Z9999W9YW99999999\tups
SLR-2025-00042\tEK123456789CN\tems-china`}
        </pre>
      </section>

      {/* 입력 */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">붙여넣기</h2>
            <p className="text-xs text-slate-500 mt-1">엑셀에서 N행 복사 → 이 영역에 붙여넣기</p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="default_carrier" className="text-xs text-slate-600">기본 캐리어</label>
            <select
              id="default_carrier"
              value={defaultCarrier}
              onChange={(e) => setDefaultCarrier(e.target.value)}
              className="h-8 px-2 text-xs border border-slate-200 rounded bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {OVERSEAS_CARRIERS.map((c) => (
                <option key={c.value} value={c.value}>{c.label || '미지정'}</option>
              ))}
            </select>
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={'예) 112-7891234-5678901\t9405511299223123456789\tusps'}
          className="block w-full text-sm font-mono bg-white border border-slate-200 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 leading-snug"
        />
        <div className="flex items-center justify-between text-xs text-slate-500">
          <p>
            인식된 행: <span className="font-semibold text-slate-700">{rows.length}</span>
            {invalid.length > 0 && (
              <span className="ml-2 text-amber-700">· 형식 오류 {invalid.length}건</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={submitting || (!text && !result)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
            >
              초기화
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || rows.length === 0}
              className="px-4 py-2 text-sm font-semibold rounded-md text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '적용 중…' : `${rows.length}건 적용`}
            </button>
          </div>
        </div>
      </section>

      {/* 미리보기 */}
      {rows.length > 0 && !result && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">미리보기 ({rows.length}건)</h2>
            <p className="text-xs text-slate-500 mt-0.5">아래 행이 그대로 매핑됩니다. 캐리어 빈 칸은 기본 캐리어로 채워집니다.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left">
                  <th scope="col" className="px-4 py-2 font-semibold text-slate-600">키 (매입 주문번호 / 셀러 주문번호)</th>
                  <th scope="col" className="px-4 py-2 font-semibold text-slate-600">운송장</th>
                  <th scope="col" className="px-4 py-2 font-semibold text-slate-600">캐리어</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.slice(0, 100).map((r, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="px-4 py-2 font-mono text-slate-800">{r.key}</td>
                    <td className="px-4 py-2 font-mono text-slate-800">{r.tracking}</td>
                    <td className="px-4 py-2 text-slate-700">
                      {r.carrier || <span className="text-slate-400">{defaultCarrier || '—'}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 100 && (
            <p className="px-6 py-2 text-[11px] text-slate-500 bg-slate-50 border-t border-slate-100">
              상위 100건만 미리보기 · 전체 {rows.length}건이 적용됩니다.
            </p>
          )}
        </section>
      )}

      {/* 결과 */}
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}
      {result && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">적용 결과</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                업데이트 <b className="text-emerald-700">{result.matched ?? 0}</b>건
                {(result.skipped_no_match?.length ?? 0) > 0 && (
                  <> · 매칭 실패 <b className="text-amber-700">{result.skipped_no_match!.length}</b>건</>
                )}
                {(result.skipped_invalid?.length ?? 0) > 0 && (
                  <> · 형식 오류 <b className="text-amber-700">{result.skipped_invalid!.length}</b>건</>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800"
            >
              새 입력 →
            </button>
          </div>

          {(result.updated?.length ?? 0) > 0 && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50/60 p-3">
              <p className="text-xs font-semibold text-emerald-900 mb-2">업데이트된 라인</p>
              <ul className="space-y-1 text-xs">
                {result.updated!.slice(0, 50).map((u) => (
                  <li key={u.item_id} className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-slate-700">{u.key}</span>
                    <span className="text-slate-400">→</span>
                    <Link
                      href={`/orders/${u.order_id}`}
                      className="text-indigo-700 hover:underline font-mono"
                    >
                      {u.order_number}
                    </Link>
                    {u.status_transitioned && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-violet-700 bg-violet-50 border border-violet-200">
                        운송 중 자동 전이
                      </span>
                    )}
                  </li>
                ))}
                {(result.updated?.length ?? 0) > 50 && (
                  <li className="text-[11px] text-slate-500 pt-1">
                    상위 50건만 표시 · 전체 {result.updated!.length}건
                  </li>
                )}
              </ul>
            </div>
          )}

          {(result.skipped_no_match?.length ?? 0) > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3">
              <p className="text-xs font-semibold text-amber-900 mb-1">매칭 실패 — 라인 없음</p>
              <p className="text-[11px] text-amber-800 mb-2">
                매입 주문번호 / 셀러 주문번호 어느 쪽으로도 라인을 찾을 수 없었습니다.
              </p>
              <ul className="font-mono text-[11px] text-amber-900 space-y-0.5">
                {result.skipped_no_match!.map((k, i) => (
                  <li key={i}>{k}</li>
                ))}
              </ul>
            </div>
          )}

          {(result.skipped_invalid?.length ?? 0) > 0 && (
            <div className="rounded-md border border-slate-200 bg-slate-50/60 p-3">
              <p className="text-xs font-semibold text-slate-700 mb-1">형식 오류</p>
              <p className="text-[11px] text-slate-600">키 또는 운송장번호가 비어 있어 건너뜀.</p>
            </div>
          )}
        </section>
      )}

      {/* 형식 오류 안내 */}
      {invalid.length > 0 && !result && (
        <div className="rounded-md border border-amber-200 bg-amber-50/60 px-4 py-3 text-xs text-amber-900 space-y-1">
          <p className="font-semibold">아래 줄은 인식되지 않았습니다 ({invalid.length}건):</p>
          <ul className="font-mono leading-tight">
            {invalid.slice(0, 5).map((l, i) => (
              <li key={i}>{l}</li>
            ))}
            {invalid.length > 5 && <li>… 외 {invalid.length - 5}건</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
