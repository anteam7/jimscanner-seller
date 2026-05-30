'use client'

import { useEffect, useState } from 'react'
import type { PickedProduct } from './ProductPicker'

type QuickPickItem = PickedProduct & {
  is_favorite: boolean
  last_purchased_at: string | null
  image_url: string | null
}

type Props = {
  onPick: (p: PickedProduct) => void
}

/**
 * 즐겨찾기 + 최근 매입 SKU 칩 행. /orders/new 의 ③ 해외 매입 섹션 상단에 표시.
 * 클릭 1번으로 라인에 product 적용 (default supplier/currency/price/weight 자동).
 */
export default function SKUQuickPick({ onPick }: Props) {
  const [favorites, setFavorites] = useState<QuickPickItem[]>([])
  const [recents, setRecents] = useState<QuickPickItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/products/quick-pick')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j) return
        setFavorites(j.favorites ?? [])
        setRecents(j.recents ?? [])
      })
      .catch(() => {/* 빈 상태로 유지 */})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return null
  if (favorites.length === 0 && recents.length === 0) return null

  return (
    <div className="rounded-md border border-indigo-100 bg-indigo-50/40 p-3 space-y-2">
      {favorites.length > 0 && (
        <Section
          title="즐겨찾기"
          icon={<StarFillIcon />}
          items={favorites}
          onPick={onPick}
          accent="amber"
        />
      )}
      {recents.length > 0 && (
        <Section
          title="최근 매입"
          icon={<ClockIcon />}
          items={recents}
          onPick={onPick}
          accent="indigo"
        />
      )}
      <p className="text-[10px] text-slate-500 pt-0.5">
        칩 클릭 시 라인 1번에 자동 채워집니다. 등록된 SKU 만 표시 ·{' '}
        <a href="/products" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-indigo-700">
          관리
        </a>
      </p>
    </div>
  )
}

function Section({
  title,
  icon,
  items,
  onPick,
  accent,
}: {
  title: string
  icon: React.ReactNode
  items: QuickPickItem[]
  onPick: (p: PickedProduct) => void
  accent: 'amber' | 'indigo'
}) {
  const chipCls =
    accent === 'amber'
      ? 'border-amber-200 bg-white hover:bg-amber-50 hover:border-amber-300'
      : 'border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300'
  const labelCls = accent === 'amber' ? 'text-amber-700' : 'text-slate-600'
  return (
    <div>
      <div className={`flex items-center gap-1 text-[11px] font-semibold ${labelCls} mb-1.5`}>
        {icon}
        <span>{title}</span>
        <span className="text-slate-400 font-normal">· {items.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p)}
            title={`${p.seller_sku} — ${p.display_name}${p.default_supplier_site ? ` (${p.default_supplier_site})` : ''}`}
            className={`inline-flex items-center gap-1 max-w-[280px] rounded border px-2 py-1 text-xs text-slate-800 shadow-sm transition-colors ${chipCls}`}
          >
            <span className="font-mono text-[10px] text-indigo-700 flex-shrink-0">{p.seller_sku}</span>
            <span className="text-slate-300">·</span>
            <span className="truncate">{p.display_name}</span>
            {p.default_supplier_site && (
              <span className="flex-shrink-0 rounded bg-sky-50 border border-sky-200 px-1 text-[9px] font-medium text-sky-700">
                {p.default_supplier_site}
              </span>
            )}
            {p.default_currency && (
              <span className="flex-shrink-0 rounded bg-slate-100 px-1 text-[9px] font-medium text-slate-500">
                {p.default_currency}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function StarFillIcon() {
  return (
    <svg className="w-3 h-3 fill-amber-500" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M9.04 2.927c.3-.92 1.62-.92 1.92 0l1.5 4.612h4.85c.969 0 1.371 1.24.588 1.81l-3.926 2.852 1.5 4.612c.3.921-.755 1.688-1.539 1.118L10 14.98l-3.926 2.852c-.784.57-1.838-.197-1.539-1.118l1.5-4.612L2.108 9.35c-.783-.57-.38-1.81.588-1.81h4.85l1.5-4.612z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}
