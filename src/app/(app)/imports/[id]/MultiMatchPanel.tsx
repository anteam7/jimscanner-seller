'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

type Match = {
  id: string
  order_id: string
  amount_share_foreign: number | string | null
  matched_at: string
  note: string | null
  b2b_orders: {
    id: string
    order_number: string | null
    market_order_number: string | null
    marketplace: string | null
    buyer_name: string | null
  } | null
}

type SearchResult = {
  id: string
  order_number: string | null
  market_order_number: string | null
  marketplace: string | null
  buyer_name: string | null
  created_at: string
}

const MARKETPLACE_LABEL: Record<string, string> = {
  coupang: '쿠팡', smartstore: '스마트스토어', auction: '옥션', gmarket: '지마켓',
  '11st': '11번가', wemakeprice: '위메프', tmon: '티몬', interpark: '인터파크',
  kakao_gift: '카카오선물', own_mall: '자사몰', kakao_channel: '카카오채널', instagram: '인스타', other: '기타',
}

function orderLabel(o: { market_order_number: string | null; order_number: string | null; marketplace: string | null }): string {
  const num = o.market_order_number || o.order_number || '주문'
  const mk = o.marketplace ? MARKETPLACE_LABEL[o.marketplace] ?? o.marketplace : ''
  return mk ? `${mk} ${num}` : num
}

export function MultiMatchPanel({ receiptId }: { receiptId: string }) {
  const router = useRouter()
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/imports/supplier-orders/${receiptId}/matches`)
      if (!res.ok) {
        setError('매칭 목록 조회 실패')
        return
      }
      const data = (await res.json()) as { matches: Match[] }
      setMatches(data.matches ?? [])
      setError(null)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setLoading(false)
    }
  }, [receiptId])

  // mount 시 1회 receipt 의 match list fetch — RSC 가 아니라 client interactive 영역이라 useEffect 필요
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])

  async function addMatch(orderId: string, amount?: number | null, note?: string) {
    const res = await fetch(`/api/imports/supplier-orders/${receiptId}/matches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId, amount_share_foreign: amount ?? null, note: note ?? null }),
    })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setError(data.error ?? '매칭 추가 실패')
      return
    }
    setModalOpen(false)
    await load()
    router.refresh()
  }

  async function removeMatch(matchId: string) {
    if (!window.confirm('이 매칭을 해제하시겠습니까?')) return
    const res = await fetch(`/api/imports/supplier-orders/${receiptId}/matches/${matchId}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setError(data.error ?? '해제 실패')
      return
    }
    await load()
    router.refresh()
  }

  return (
    <section className="rounded-lg bg-white shadow-sm border border-slate-200 px-5 py-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-bold text-slate-900">
          🔗 매칭된 주문 {matches ? `(${matches.length}건)` : ''}
        </h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-300 rounded hover:bg-indigo-100"
        >
          + 매칭 추가
        </button>
      </div>
      {loading ? (
        <p className="text-xs text-slate-500">불러오는 중…</p>
      ) : matches && matches.length > 0 ? (
        <ul className="divide-y divide-slate-100 -mx-2">
          {matches.map((m) => (
            <li key={m.id} className="px-2 py-2 flex items-center justify-between gap-3 hover:bg-slate-50/60">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {m.b2b_orders ? orderLabel(m.b2b_orders) : '주문 (삭제됨?)'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {m.b2b_orders?.buyer_name && <span className="mr-2">👤 {m.b2b_orders.buyer_name}</span>}
                  {m.amount_share_foreign != null && <span className="mr-2">금액 분할: {String(m.amount_share_foreign)}</span>}
                  <span className="text-slate-400">{new Date(m.matched_at).toLocaleString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                </p>
                {m.note && <p className="text-[10px] text-slate-500 mt-0.5">메모: {m.note}</p>}
              </div>
              <button
                type="button"
                onClick={() => removeMatch(m.id)}
                className="px-2 py-1 text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 shrink-0"
              >
                해제
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">아직 매칭된 주문이 없습니다.</p>
      )}
      <p role="alert" className={error ? 'text-xs text-rose-600' : 'sr-only'}>{error}</p>
      {modalOpen && (
        <SearchModal
          onClose={() => setModalOpen(false)}
          onPick={(orderId) => addMatch(orderId)}
          alreadyMatched={new Set((matches ?? []).map((m) => m.order_id))}
        />
      )}
      <p className="text-[10px] text-slate-400">
        💡 한 영수증을 여러 주문에 분할 매칭 가능 (split shipment·다중 마켓 동일 SKU). 금액 분할은 선택 입력.
      </p>
    </section>
  )
}

function SearchModal({
  onClose, onPick, alreadyMatched,
}: {
  onClose: () => void
  onPick: (orderId: string) => void
  alreadyMatched: Set<string>
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const doSearch = useCallback(async (query: string) => {
    setLoading(true)
    try {
      const url = '/api/orders?limit=50' + (query ? `&q=${encodeURIComponent(query)}` : '')
      const res = await fetch(url)
      if (!res.ok) { setResults([]); return }
      const data = (await res.json()) as { orders?: SearchResult[] }
      setResults(data.orders ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // 열림 시점의 포커스를 캡처 → 닫힐 때 트리거로 복귀 (WCAG 2.4.3)
    const previouslyFocused = document.activeElement as HTMLElement | null
    inputRef.current?.focus()
    // 검색 모달 mount 시 1회 빈 query 로 prefill — debounced input 외부에서 일어나야 함
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void doSearch('')
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      // 포커스 트랩 — Tab/Shift+Tab 이 백드롭 뒤 배경으로 빠지지 않게 패널 안에서 순환 (WCAG 2.4.3·2.1.2)
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) { e.preventDefault(); last.focus() }
      } else if (active === last || !panel.contains(active)) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previouslyFocused?.focus?.()
    }
  }, [doSearch, onClose])

  function onChange(v: string) {
    setQ(v)
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => { void doSearch(v) }, 250)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/40" onClick={onClose}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="multimatch-search-title" className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 id="multimatch-search-title" className="text-sm font-bold text-slate-900">매칭할 주문 검색</h3>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-3 border-b border-slate-100">
          <input ref={inputRef} type="text" value={q} onChange={(e) => onChange(e.target.value)}
            aria-label="매칭할 주문 검색 (주문번호·구매자명·전화번호)"
            placeholder="주문번호 / 구매자명 / 전화번호"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <p role="status" aria-live="polite" className="mt-1.5 text-[11px] text-slate-500">{loading ? '검색 중…' : `${results.length}건`}</p>
        </div>
        <div className="overflow-y-auto max-h-96">
          {results.length === 0 && !loading ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500">주문이 없습니다.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {results.map((o) => {
                const isMatched = alreadyMatched.has(o.id)
                return (
                  <li key={o.id}>
                    <button type="button" onClick={() => !isMatched && onPick(o.id)} disabled={isMatched}
                      className={`w-full text-left px-5 py-3 transition-colors ${isMatched ? 'opacity-40 cursor-not-allowed' : 'hover:bg-indigo-50'}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[12px] font-semibold text-slate-900">{orderLabel(o)}</span>
                        {isMatched && <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">이미 매칭됨</span>}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{o.buyer_name ? `👤 ${o.buyer_name}` : '구매자 미기재'}</p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
          <span>주문 클릭 → 즉시 매칭 추가</span>
          <span>ESC 로 닫기</span>
        </div>
      </div>
    </div>
  )
}
