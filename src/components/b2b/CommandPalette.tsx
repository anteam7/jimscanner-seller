'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MARKETPLACE_LABEL } from '@/lib/b2b/order-options'

type OrderHit = {
  id: string
  order_number: string | null
  status: string | null
  marketplace: string | null
  market_order_number: string | null
  buyer_name: string | null
}

type ProductHit = {
  id: string
  seller_sku: string | null
  display_name: string | null
  category: string | null
}

type Destination = { href: string; label: string; keywords: string }

// 정적 이동 대상 — SellerShell 의 NAV_ITEMS 와 동일한 경로.
// 헤비 셀러가 메뉴를 뒤지지 않고 바로 점프하도록 한·영 키워드를 함께 둔다.
const DESTINATIONS: Destination[] = [
  { href: '/dashboard', label: '대시보드', keywords: 'dashboard 홈 home' },
  { href: '/orders', label: '국내 주문 목록', keywords: 'orders 주문 목록' },
  { href: '/orders/new', label: '국내 주문 단건 등록', keywords: 'new order 단건 등록 신규' },
  { href: '/orders/bulk', label: '국내 주문 일괄 등록', keywords: 'bulk 일괄 paste 붙여넣기' },
  { href: '/orders/matching', label: '주문매칭관리', keywords: 'matching 매칭 영수증' },
  { href: '/orders/tracking-paste', label: '운송장 일괄 입력', keywords: 'tracking 운송장 송장' },
  { href: '/refunds', label: '환불 관리', keywords: 'refund 환불' },
  { href: '/eta', label: '도착 예정 (ETA)', keywords: 'eta 도착 예정 배송 캘린더' },
  { href: '/settlement', label: '배대지 정산 대조', keywords: 'settlement 정산 대조 청구' },
  { href: '/products', label: '해외 상품관리', keywords: 'products sku 상품' },
  { href: '/products/domestic', label: '국내 상품관리', keywords: 'domestic 국내 상품' },
  { href: '/products/matching', label: '상품매칭', keywords: 'product matching 상품 매칭' },
  { href: '/imports', label: '해외주문관리 (매입)', keywords: 'imports 매입 해외주문' },
  { href: '/clients', label: '단골 구매자', keywords: 'clients 구매자 단골 고객' },
  { href: '/analytics', label: '매출·마진', keywords: 'analytics 매출 마진 통계' },
  { href: '/recommendations', label: '추천 상품', keywords: 'recommendations 추천' },
  { href: '/resources/customs-guide', label: '통관 가이드', keywords: 'customs 통관 가이드' },
  { href: '/templates', label: '배대지 양식', keywords: 'templates 양식 배대지 forwarder' },
  { href: '/pricing', label: '요금제', keywords: 'pricing 요금제 플랜 plan' },
  { href: '/support', label: '1:1 문의', keywords: 'support 문의 고객센터' },
  { href: '/settings', label: '설정', keywords: 'settings 설정 환경설정' },
]

const STATUS_LABEL: Record<string, string> = {
  pending: '마켓 주문 접수',
  confirmed: '매입 발주 완료',
  paid: '해외 매입 완료',
  forwarder_submitted: '배대지 입고',
  in_transit: '운송 중',
  arrived_korea: '한국 통관',
  delivered: '구매자 수령',
  completed: '구매 확정',
  cancelled: '취소',
  refund_requested: '환불 신청',
  refunded: '환불 완료',
  customs_denied: '통관 거부',
  disputed: '분쟁 중',
}

// 평탄화된 결과 1건 (방향키 탐색 단위)
type FlatItem = { key: string; href: string; group: 'menu' | 'order' | 'product' }

export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [orders, setOrders] = useState<OrderHit[]>([])
  const [products, setProducts] = useState<ProductHit[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const trimmed = query.trim()

  // 정적 메뉴 필터 (쿼리 없으면 전체 노출)
  const menuHits = useMemo(() => {
    if (!trimmed) return DESTINATIONS
    const t = trimmed.toLowerCase()
    return DESTINATIONS.filter(
      (d) => d.label.toLowerCase().includes(t) || d.keywords.toLowerCase().includes(t),
    )
  }, [trimmed])

  // body scroll lock (이 컴포넌트는 열릴 때마다 부모가 key 로 remount 한다)
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // 디바운스된 주문/상품 검색 — 쿼리가 2자 이상일 때만 서버 호출.
  // 2자 미만이면 fetch 자체를 건너뛴다 (결과 섹션은 showServerSections 로 가려짐).
  useEffect(() => {
    if (!open || trimmed.length < 2) return
    const ctrl = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      const qs = encodeURIComponent(trimmed)
      Promise.all([
        fetch(`/api/orders?q=${qs}&limit=8`, { signal: ctrl.signal })
          .then((r) => (r.ok ? r.json() : { orders: [] }))
          .catch(() => ({ orders: [] })),
        fetch(`/api/products?q=${qs}`, { signal: ctrl.signal })
          .then((r) => (r.ok ? r.json() : { products: [] }))
          .catch(() => ({ products: [] })),
      ]).then(([o, p]) => {
        if (ctrl.signal.aborted) return
        setOrders((o.orders ?? []).slice(0, 8))
        setProducts((p.products ?? []).slice(0, 8))
        setSelected(0)
        setLoading(false)
      })
    }, 220)
    return () => {
      ctrl.abort()
      clearTimeout(timer)
    }
  }, [open, trimmed])

  // 모든 그룹을 하나의 인덱스 배열로 평탄화 (메뉴 → 주문 → 상품)
  const flat = useMemo<FlatItem[]>(() => {
    const items: FlatItem[] = []
    for (const m of menuHits) items.push({ key: `menu:${m.href}`, href: m.href, group: 'menu' })
    for (const o of orders) items.push({ key: `order:${o.id}`, href: `/orders/${o.id}`, group: 'order' })
    for (const p of products) items.push({ key: `product:${p.id}`, href: `/products/${p.id}`, group: 'product' })
    return items
  }, [menuHits, orders, products])

  // 결과 길이가 줄어도 effect 로 보정하지 않고 사용 시점에 clamp
  const activeIndex = flat.length === 0 ? -1 : Math.min(selected, flat.length - 1)

  const go = useCallback(
    (href: string) => {
      onClose()
      router.push(href)
    },
    [onClose, router],
  )

  // 선택 항목이 보이도록 스크롤
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-selected="true"]')
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, flat.length])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected((s) => (flat.length === 0 ? 0 : (Math.min(s, flat.length - 1) + 1) % flat.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected((s) =>
        flat.length === 0 ? 0 : (Math.min(s, flat.length - 1) - 1 + flat.length) % flat.length,
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = activeIndex >= 0 ? flat[activeIndex] : undefined
      if (hit) go(hit.href)
    }
  }

  if (!open) return null

  const orderStart = menuHits.length
  const productStart = menuHits.length + orders.length
  const showServerSections = trimmed.length >= 2
  // aria-activedescendant 가 가리킬 현재 활성 옵션 id (combobox/listbox 패턴)
  const activeId = activeIndex >= 0 ? `cmdk-opt-${activeIndex}` : undefined

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh] sm:pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="빠른 검색"
    >
      <button
        type="button"
        aria-label="검색 닫기"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
      />
      <div
        className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
        onKeyDown={onKeyDown}
      >
        {/* 검색 입력 */}
        <div className="flex items-center gap-2.5 px-4 border-b border-slate-100">
          <svg aria-hidden="true" className="w-4 h-4 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            type="text"
            placeholder="주문번호·구매자·전화·SKU·메뉴 검색…"
            aria-label="빠른 검색 입력"
            role="combobox"
            aria-expanded
            aria-controls="cmdk-results"
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            className="flex-1 py-3.5 text-sm bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center text-[10px] font-medium text-slate-400 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* 결과 목록 */}
        <div
          ref={listRef}
          id="cmdk-results"
          role="listbox"
          aria-label="검색 결과"
          className="max-h-[55vh] overflow-y-auto py-2"
        >
          {/* 메뉴 섹션 */}
          {menuHits.length > 0 && (
            <Section title="메뉴">
              {menuHits.map((m, i) => (
                <Row
                  key={m.href}
                  id={`cmdk-opt-${i}`}
                  selected={activeIndex === i}
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => go(m.href)}
                  icon={<MenuIcon />}
                  title={m.label}
                  meta={m.href}
                />
              ))}
            </Section>
          )}

          {/* 주문 섹션 */}
          {showServerSections && orders.length > 0 && (
            <Section title="주문">
              {orders.map((o, i) => {
                const idx = orderStart + i
                return (
                  <Row
                    key={o.id}
                    id={`cmdk-opt-${idx}`}
                    selected={activeIndex === idx}
                    onMouseEnter={() => setSelected(idx)}
                    onClick={() => go(`/orders/${o.id}`)}
                    icon={<OrderIcon />}
                    title={o.order_number || o.market_order_number || '(주문번호 없음)'}
                    meta={[
                      o.marketplace ? MARKETPLACE_LABEL.get(o.marketplace) ?? o.marketplace : null,
                      o.buyer_name,
                      o.status ? STATUS_LABEL[o.status] ?? o.status : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  />
                )
              })}
            </Section>
          )}

          {/* 상품 섹션 */}
          {showServerSections && products.length > 0 && (
            <Section title="상품 (SKU)">
              {products.map((p, i) => {
                const idx = productStart + i
                return (
                  <Row
                    key={p.id}
                    id={`cmdk-opt-${idx}`}
                    selected={activeIndex === idx}
                    onMouseEnter={() => setSelected(idx)}
                    onClick={() => go(`/products/${p.id}`)}
                    icon={<ProductIcon />}
                    title={p.display_name || p.seller_sku || '(이름 없음)'}
                    meta={[p.seller_sku, p.category].filter(Boolean).join(' · ')}
                  />
                )
              })}
            </Section>
          )}

          {/* 로딩 / 빈 상태 */}
          {showServerSections && loading && orders.length === 0 && products.length === 0 && (
            <p className="px-4 py-6 text-center text-xs text-slate-400">검색 중…</p>
          )}
          {showServerSections &&
            !loading &&
            orders.length === 0 &&
            products.length === 0 &&
            menuHits.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-500">
                &lsquo;{trimmed}&rsquo; 에 대한 결과가 없습니다.
              </p>
            )}
          {!showServerSections && menuHits.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-slate-500">일치하는 메뉴가 없습니다.</p>
          )}
        </div>

        {/* 하단 힌트 */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1">
            <kbd className="font-sans bg-white border border-slate-200 rounded px-1">↑</kbd>
            <kbd className="font-sans bg-white border border-slate-200 rounded px-1">↓</kbd>
            이동
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="font-sans bg-white border border-slate-200 rounded px-1">↵</kbd>
            열기
          </span>
          {trimmed.length === 1 && <span className="ml-auto">2자 이상 입력 시 주문·상품 검색</span>}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1">
      <p className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </p>
      {children}
    </div>
  )
}

function Row({
  id,
  selected,
  onMouseEnter,
  onClick,
  icon,
  title,
  meta,
}: {
  id: string
  selected: boolean
  onMouseEnter: () => void
  onClick: () => void
  icon: React.ReactNode
  title: string
  meta?: string
}) {
  return (
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={selected}
      tabIndex={-1}
      data-selected={selected ? 'true' : undefined}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-2 py-2 rounded-md text-left transition-colors ${
        selected ? 'bg-indigo-50 text-indigo-900' : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <span className={`flex-shrink-0 ${selected ? 'text-indigo-500' : 'text-slate-400'}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        {meta && <span className="block truncate text-[11px] text-slate-400">{meta}</span>}
      </span>
    </button>
  )
}

function MenuIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  )
}

function OrderIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 10.5V6a3.75 3.75 0 1 1 7.5 0v4.5m-9.75 0h12l.75 9.75a1.5 1.5 0 0 1-1.5 1.65H7.5a1.5 1.5 0 0 1-1.5-1.65l.75-9.75Z" />
    </svg>
  )
}

function ProductIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  )
}
