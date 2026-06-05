'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

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

function orderLabel(o: SearchResult): string {
  const num = o.market_order_number || o.order_number || '주문'
  const mk = o.marketplace ? MARKETPLACE_LABEL[o.marketplace] ?? o.marketplace : ''
  return mk ? `${mk} ${num}` : num
}

function fmtForeign(v: number | string | null, c: string | null): string {
  if (v == null) return '—'
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return '—'
  if (c === 'KRW') return `₩${Math.round(n).toLocaleString('ko-KR')}`
  if (c === 'JPY') return `¥${n.toLocaleString('ko-KR')}`
  if (c === 'USD') return `$${n.toFixed(2)}`
  return `${n.toLocaleString('ko-KR')} ${c ?? ''}`.trim()
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}

type Item = {
  receiptId: string
  source: string
  sourceLabel: string
  supplier_order_number: string
  purchased_at: string | null
  total_foreign: number | string | null
  currency: string | null
  matched_order_label: string | null
  suggestion: { orderId: string; label: string; score: number } | null
  amount: {
    receiptTotal: number
    orderTotal: number
    deltaPct: number
    currencyMismatch: boolean
    orderCurrency: string | null
  } | null
}

/** 금액 차이 경고 임계값 (±10% 초과 시 ⚠️). 추후 셀러 설정으로 조정 가능. */
const AMOUNT_DELTA_THRESHOLD = 0.1

export function OrderMatchingClient({ items }: { items: Item[] }) {
  const router = useRouter()
  const [tab, setTab] = useState<'unmatched' | 'matched' | 'all'>('unmatched')
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ ok: number; fail: number } | null>(null)

  const filtered = items.filter((it) => {
    if (tab === 'unmatched') return !it.matched_order_label
    if (tab === 'matched') return !!it.matched_order_label
    return true
  })

  // 일괄 매칭 가능한 후보 (대기 + 추천 있음)
  const high90 = items.filter((i) => !i.matched_order_label && i.suggestion && i.suggestion.score >= 90)
  const mid70 = items.filter((i) => !i.matched_order_label && i.suggestion && i.suggestion.score >= 70 && i.suggestion.score < 90)

  async function bulkApply(targets: Item[], label: string) {
    if (targets.length === 0) return
    if (!window.confirm(`${label} ${targets.length}건을 일괄 매칭합니다. 계속할까요?`)) return
    setBulkBusy(true)
    setBulkResult(null)
    let ok = 0, fail = 0
    await Promise.all(targets.map(async (t) => {
      if (!t.suggestion) { fail++; return }
      try {
        const res = await fetch(`/api/imports/supplier-orders/${t.receiptId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matched_order_id: t.suggestion.orderId }),
        })
        if (res.ok) ok++; else fail++
      } catch { fail++ }
    }))
    setBulkResult({ ok, fail })
    setBulkBusy(false)
    router.refresh()
  }

  return (
    <div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden">
      {/* 일괄 매칭 액션 바 */}
      {(high90.length > 0 || mid70.length > 0) && (
        <div className="px-4 py-3 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-white flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-indigo-900">🔗 일괄 매칭:</span>
            {high90.length > 0 && (
              <button type="button" disabled={bulkBusy} aria-busy={bulkBusy}
                onClick={() => bulkApply(high90, '90점 이상 추천')}
                className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-white border border-indigo-300 rounded hover:bg-indigo-50 disabled:opacity-50">
                90+ 점 일괄 적용 ({high90.length})
              </button>
            )}
            {mid70.length > 0 && (
              <button type="button" disabled={bulkBusy} aria-busy={bulkBusy}
                onClick={() => bulkApply(mid70, '70~89점 추천')}
                className="px-2.5 py-1 text-[11px] font-semibold text-amber-700 bg-white border border-amber-300 rounded hover:bg-amber-50 disabled:opacity-50">
                70~89점 일괄 적용 ({mid70.length}) <span className="text-[9px]">(검증 권장)</span>
              </button>
            )}
          </div>
          {bulkResult && (
            <span className="text-[11px] text-slate-700">
              ✓ {bulkResult.ok}건 매칭{bulkResult.fail > 0 && <span className="text-rose-600 ml-2">✗ {bulkResult.fail}건 실패</span>}
            </span>
          )}
          {/* 스크린리더 전용: 일괄 매칭 진행/결과 announce (시각 표시는 위 bulkResult span) */}
          <span role="status" aria-live="polite" className="sr-only">
            {bulkBusy ? '추천 주문 일괄 매칭 적용 중…' : bulkResult ? `${bulkResult.ok}건 매칭 완료${bulkResult.fail > 0 ? `, ${bulkResult.fail}건 실패` : ''}` : ''}
          </span>
        </div>
      )}

      <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex gap-1">
        <TabBtn active={tab === 'unmatched'} onClick={() => setTab('unmatched')} label={`대기 (${items.filter((i) => !i.matched_order_label).length})`} />
        <TabBtn active={tab === 'matched'} onClick={() => setTab('matched')} label={`매칭됨 (${items.filter((i) => !!i.matched_order_label).length})`} />
        <TabBtn active={tab === 'all'} onClick={() => setTab('all')} label={`전체 (${items.length})`} />
      </div>
      {filtered.length === 0 ? (
        <div className="px-6 py-16 text-center text-sm text-slate-500">
          {tab === 'unmatched' ? '대기 중인 영수증이 없습니다.' : tab === 'matched' ? '매칭된 영수증이 없습니다.' : '영수증이 없습니다.'}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {filtered.map((it) => (
            <ReceiptRow key={it.receiptId} item={it} />
          ))}
        </ul>
      )}
    </div>
  )
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
        active ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-white'
      }`}
    >
      {label}
    </button>
  )
}

function ReceiptRow({ item }: { item: Item }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  async function link(orderId: string | null) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/imports/supplier-orders/${item.receiptId}`, {
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

  return (
    <li className="px-4 py-3 hover:bg-slate-50/60">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded">
              {item.sourceLabel}
            </span>
            <span className="font-mono text-[11px] text-slate-700">{item.supplier_order_number}</span>
            <span className="text-[11px] text-slate-400 tabular-nums">{fmtDate(item.purchased_at)}</span>
            <span className="text-[11px] text-slate-900 tabular-nums font-semibold">{fmtForeign(item.total_foreign, item.currency)}</span>
          </div>
          {item.matched_order_label ? (
            <p className="text-[11px] text-emerald-700 font-semibold">✓ {item.matched_order_label}</p>
          ) : item.suggestion ? (
            <p className="text-[11px] text-slate-500">
              추천: <span className="text-indigo-700 font-semibold">{item.suggestion.label}</span>
              <span className="text-slate-400 ml-1.5 tabular-nums">{item.suggestion.score}점</span>
            </p>
          ) : (
            <p className="text-[11px] text-amber-700">추천 없음 — [🔍 검색] 으로 매칭</p>
          )}
          <AmountWarning item={item} />
          {/* 매칭 실패 에러: 항상 DOM 존재(빈 값은 sr-only) → SR announce, 시각·레이아웃 무변경 */}
          <p role="alert" className={error ? 'text-[10px] text-rose-600 mt-1' : 'sr-only'}>{error}</p>
          {/* 스크린리더 전용: 매칭 추가/해제 진행 announce */}
          <span role="status" aria-live="polite" className="sr-only">{busy ? '주문 매칭 처리 중…' : ''}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {item.matched_order_label ? (
            <>
              <button type="button" onClick={() => setModalOpen(true)} disabled={busy} aria-busy={busy}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50">
                변경
              </button>
              <button type="button" onClick={() => link(null)} disabled={busy} aria-busy={busy}
                className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 disabled:opacity-50">
                해제
              </button>
            </>
          ) : (
            <>
              {item.suggestion && (
                <button type="button" onClick={() => link(item.suggestion!.orderId)} disabled={busy} aria-busy={busy}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-300 rounded hover:bg-indigo-100 disabled:opacity-50">
                  🔗 추천 적용
                </button>
              )}
              <button type="button" onClick={() => setModalOpen(true)} disabled={busy} aria-busy={busy}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50">
                🔍 검색
              </button>
            </>
          )}
        </div>
      </div>
      {modalOpen && <SearchModal onClose={() => setModalOpen(false)} onPick={(orderId) => link(orderId)} busy={busy} error={error} />}
    </li>
  )
}

function AmountWarning({ item }: { item: Item }) {
  const a = item.amount
  if (!a) return null

  // 통화 불일치: 환산 없이 경고만
  if (a.currencyMismatch) {
    return (
      <p className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded">
        ⚠️ 통화 다름 · 영수증 {item.currency ?? '—'} / 주문 {a.orderCurrency ?? '—'} (금액 비교 불가)
      </p>
    )
  }

  // 임계값 이내면 경고 숨김
  if (Math.abs(a.deltaPct) <= AMOUNT_DELTA_THRESHOLD) return null

  const pctLabel = `${a.deltaPct > 0 ? '+' : ''}${(a.deltaPct * 100).toFixed(0)}%`
  const diff = a.receiptTotal - a.orderTotal
  // deltaPct < 0 → 주문 합계가 영수증보다 큼 (분할발송 의심), > 0 → 영수증이 더 큼
  const hint = a.deltaPct < 0 ? '주문 합계가 더 큼 — 분할발송/일부 영수증 누락 의심' : '영수증이 더 큼 — 추가 매입/가격변동 확인'
  return (
    <p
      className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 rounded"
      title={hint}
    >
      ⚠️ 금액 차이 {pctLabel} · 영수증 {fmtForeign(a.receiptTotal, item.currency)} / 주문 {fmtForeign(a.orderTotal, a.orderCurrency)} (차액 {fmtForeign(Math.abs(diff), item.currency)})
    </p>
  )
}

function SearchModal({
  onClose, onPick, busy, error,
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
  const panelRef = useRef<HTMLDivElement | null>(null)

  const doSearch = useCallback(async (query: string) => {
    setLoading(true)
    try {
      const url = '/api/orders?limit=50' + (query ? `&q=${encodeURIComponent(query)}` : '')
      const res = await fetch(url)
      if (!res.ok) { setResults([]); return }
      const data = (await res.json()) as { orders?: SearchResult[] }
      setResults(data.orders ?? [])
    } catch { setResults([]) } finally { setLoading(false) }
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
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="order-match-search-title"
        className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 id="order-match-search-title" className="text-sm font-bold text-slate-900">짐스캐너 주문 검색</h3>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-3 border-b border-slate-100">
          <input ref={inputRef} type="text" value={q} onChange={(e) => onChange(e.target.value)}
            aria-label="매칭할 주문 검색 (마켓 주문번호·셀러 주문번호·구매자명·전화번호)"
            placeholder="마켓 주문번호 / 셀러 주문번호 / 구매자명 / 전화번호"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          <p role="status" aria-live="polite" className="mt-1.5 text-[11px] text-slate-500">{loading ? '검색 중…' : `${results.length}건${q ? ` (검색: ${q})` : ' (최근 주문)'}`}</p>
        </div>
        <div className="overflow-y-auto max-h-96">
          {results.length === 0 && !loading ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500">주문이 없습니다.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {results.map((o) => (
                <li key={o.id}>
                  <button type="button" onClick={() => onPick(o.id)} disabled={busy} aria-busy={busy}
                    className="w-full text-left px-5 py-3 hover:bg-indigo-50 disabled:opacity-50 transition-colors">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-mono text-[12px] font-semibold text-slate-900">{orderLabel(o)}</span>
                      <span className="text-[10px] text-slate-400 tabular-nums">{fmtDate(o.created_at)}</span>
                    </div>
                    <div className="text-[11px] text-slate-600">{o.buyer_name ? `👤 ${o.buyer_name}` : '구매자 미기재'}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {error && <div role="alert" className="px-5 py-2 border-t border-rose-100 bg-rose-50 text-[11px] text-rose-700">{error}</div>}
        <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
          <span>주문 클릭 → 즉시 매칭</span>
          <span>ESC 로 닫기</span>
        </div>
      </div>
    </div>
  )
}
