'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_AUTOMATCH_THRESHOLD } from './AutoMatchThreshold'

type SearchResult = {
  id: string
  order_number: string | null
  market_order_number: string | null
  marketplace: string | null
  buyer_name: string | null
  created_at: string
}

type Props = {
  receiptId: string
  recommendation?: {
    orderId: string
    label: string
    score: number
    reasons: string[]
  } | null
  matchedOrderLabel?: string | null
  /** 계정 자동 매칭 임계값 — 이 점수 이상은 확인 창 생략. */
  autoThreshold?: number
}

const MARKETPLACE_LABEL: Record<string, string> = {
  coupang: '쿠팡',
  smartstore: '스마트스토어',
  auction: '옥션',
  gmarket: '지마켓',
  '11st': '11번가',
  wemakeprice: '위메프',
  tmon: '티몬',
  interpark: '인터파크',
  ssg: 'SSG',
  lotte_on: '롯데온',
  kakao: '카카오',
  naver: '네이버',
  own_mall: '자사몰',
  kakao_gift: '카카오선물',
  kakao_channel: '카카오채널',
  instagram: '인스타',
  other: '기타',
}

function labelFor(o: SearchResult): string {
  const num = o.market_order_number || o.order_number || '주문'
  const mk = o.marketplace ? MARKETPLACE_LABEL[o.marketplace] ?? o.marketplace : ''
  return mk ? `${mk} ${num}` : num
}

export function ImportMatchAction({
  receiptId,
  recommendation,
  matchedOrderLabel,
  autoThreshold = DEFAULT_AUTOMATCH_THRESHOLD,
}: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  async function link(orderId: string | null, opts?: { confirmText?: string; skipConfirm?: boolean }) {
    if (!opts?.skipConfirm && opts?.confirmText) {
      if (!window.confirm(opts.confirmText)) return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/imports/supplier-orders/${receiptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matched_order_id: orderId }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setError(data.error ?? '매칭 실패')
        setBusy(false)
        return
      }
      setModalOpen(false)
      router.refresh()
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
      setBusy(false)
    }
  }

  // 추천 점수에 따라 confirm 문구 결정
  function confirmTextFor(rec: NonNullable<Props['recommendation']>): string | undefined {
    if (rec.score >= autoThreshold) return undefined // 셀러 설정 임계값 이상은 confirm 생략
    const warn = rec.score < 70 ? '⚠️ 주의: 매칭 점수가 낮습니다.\n\n' : ''
    return `${warn}이 영수증을 [${rec.label}] 주문에 매칭하시겠습니까?\n\n점수: ${rec.score}\n근거: ${rec.reasons.join(' · ')}\n\n매칭 후 [해제] 로 되돌릴 수 있습니다.`
  }

  if (matchedOrderLabel) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded">
          ✓ {matchedOrderLabel}
        </span>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={busy}
          className="text-[10px] text-slate-500 hover:text-indigo-700 hover:underline underline-offset-2 disabled:opacity-50"
          title="다른 주문으로 변경"
        >
          변경
        </button>
        <button
          type="button"
          onClick={() => link(null)}
          disabled={busy}
          className="text-[10px] text-slate-500 hover:text-rose-600 hover:underline underline-offset-2 disabled:opacity-50"
          title="매칭 해제"
        >
          해제
        </button>
        {modalOpen && (
          <SearchModal
            onClose={() => setModalOpen(false)}
            onPick={(orderId) => link(orderId)}
            busy={busy}
            error={error}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 flex-wrap">
        {recommendation ? (
          <button
            type="button"
            onClick={() => link(recommendation.orderId, { confirmText: confirmTextFor(recommendation) })}
            disabled={busy}
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold border rounded hover:opacity-80 disabled:opacity-50 transition-colors ${
              recommendation.score >= 90
                ? 'text-indigo-700 bg-indigo-50 border-indigo-300'
                : recommendation.score >= 70
                  ? 'text-amber-800 bg-amber-50 border-amber-300'
                  : 'text-rose-800 bg-rose-50 border-rose-300'
            }`}
            title={recommendation.reasons.join(' · ')}
          >
            🔗 {recommendation.label}
          </button>
        ) : (
          <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded">
            추천 없음
          </span>
        )}
        {recommendation && (
          <span className="text-[10px] text-slate-400 tabular-nums">{recommendation.score}점</span>
        )}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={busy}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50 transition-colors"
          title="주문 검색해서 매칭"
        >
          🔍 검색
        </button>
      </div>
      {error && <span className="text-[10px] text-rose-600">{error}</span>}
      {modalOpen && (
        <SearchModal
          onClose={() => setModalOpen(false)}
          onPick={(orderId) => link(orderId)}
          busy={busy}
          error={error}
        />
      )}
    </div>
  )
}

function SearchModal({
  onClose,
  onPick,
  busy,
  error,
}: {
  onClose: () => void
  onPick: (orderId: string) => void
  busy: boolean
  error: string | null
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const doSearch = useCallback(async (query: string) => {
    setLoading(true)
    try {
      const url = '/api/orders?limit=50' + (query ? `&q=${encodeURIComponent(query)}` : '')
      const res = await fetch(url)
      if (!res.ok) {
        setResults([])
        return
      }
      const data = (await res.json()) as { orders?: SearchResult[] }
      setResults(data.orders ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
    // 모달 mount 시 1회 빈 query 로 초기 검색 결과 prefill — debounced input 외부에서 일어나야 함
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void doSearch('')
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [doSearch, onClose])

  function onChange(v: string) {
    setQ(v)
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      void doSearch(v)
    }, 250)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">짐스캐너 주문 검색</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none"
            aria-label="닫기"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-3 border-b border-slate-100">
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => onChange(e.target.value)}
            placeholder="마켓 주문번호 / 셀러 주문번호 / 구매자명 / 전화번호"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p className="mt-1.5 text-[11px] text-slate-500">
            {loading ? '검색 중…' : `${results.length}건${q ? ` (검색: ${q})` : ' (최근 주문)'}`}
          </p>
        </div>
        <div className="overflow-y-auto max-h-96">
          {results.length === 0 && !loading ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500">
              주문이 없습니다.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {results.map((o) => {
                const d = new Date(o.created_at)
                const date =
                  String(d.getFullYear()).slice(2) +
                  '.' +
                  String(d.getMonth() + 1).padStart(2, '0') +
                  '.' +
                  String(d.getDate()).padStart(2, '0')
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => onPick(o.id)}
                      disabled={busy}
                      className="w-full text-left px-5 py-3 hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-mono text-[12px] font-semibold text-slate-900">
                          {labelFor(o)}
                        </span>
                        <span className="text-[10px] text-slate-400 tabular-nums">{date}</span>
                      </div>
                      <div className="text-[11px] text-slate-600">
                        {o.buyer_name ? `👤 ${o.buyer_name}` : '구매자 미기재'}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        {error && (
          <div className="px-5 py-2 border-t border-rose-100 bg-rose-50 text-[11px] text-rose-700">
            {error}
          </div>
        )}
        <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
          <span>주문 클릭 → 즉시 매칭</span>
          <span>ESC 로 닫기</span>
        </div>
      </div>
    </div>
  )
}
