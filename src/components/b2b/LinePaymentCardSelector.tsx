'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type CardOption = {
  id: string
  alias: string
  last4: string | null
  color: string | null
  is_active: boolean
}

type Props = {
  orderId: string
  itemId: string
  initialCardId: string | null
  initialCardLabel: string | null
}

const COLOR_CLS: Record<string, string> = {
  indigo: 'bg-indigo-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  sky: 'bg-sky-500',
  slate: 'bg-slate-700',
}

export function LinePaymentCardSelector({ orderId, itemId, initialCardId, initialCardLabel }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [cards, setCards] = useState<CardOption[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [cardId, setCardId] = useState<string | null>(initialCardId)
  const [cardLabel, setCardLabel] = useState<string | null>(initialCardLabel)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || cards != null) return
    let cancelled = false
    fetch('/api/payment-cards', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: { cards?: CardOption[] }) => {
        if (!cancelled) setCards(Array.isArray(j.cards) ? j.cards : [])
      })
      .catch(() => {
        if (!cancelled) setCards([])
      })
    return () => {
      cancelled = true
    }
  }, [open, cards])

  async function assign(c: CardOption | null) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}/payment-card`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_card_id: c ? c.id : null }),
      })
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !json.ok) {
        setError(json.error ?? '저장 실패')
        return
      }
      if (c) {
        setCardId(c.id)
        setCardLabel(`${c.alias}${c.last4 ? ` ···· ${c.last4}` : ''}`)
      } else {
        setCardId(null)
        setCardLabel(null)
      }
      setOpen(false)
      router.refresh()
    } catch {
      setError('네트워크 오류')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-1.5">
      {cardId && cardLabel && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 hover:bg-emerald-100 transition-colors"
          title="결제 카드 변경"
        >
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" aria-hidden />
          <span className="font-medium">{cardLabel}</span>
        </button>
      ) : !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[11px] text-slate-400 hover:text-indigo-600 transition-colors"
        >
          + 결제 카드 매핑
        </button>
      ) : (
        <div className="mt-1 p-2 rounded border border-slate-200 bg-slate-50 space-y-1.5">
          {cards == null ? (
            <p className="text-[11px] text-slate-500">불러오는 중…</p>
          ) : cards.length === 0 ? (
            <div className="text-[11px] text-slate-500 space-y-1">
              <p>등록된 카드가 없습니다.</p>
              <Link href="/settings/cards" className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2">
                카드 등록 →
              </Link>
            </div>
          ) : (
            <ul className="space-y-1">
              {cards
                .filter((c) => c.is_active || c.id === cardId)
                .map((c) => {
                  const colorCls = c.color && COLOR_CLS[c.color] ? COLOR_CLS[c.color] : 'bg-slate-400'
                  const selected = c.id === cardId
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        disabled={busy}
                        aria-busy={busy}
                        onClick={() => assign(selected ? null : c)}
                        className={`w-full flex items-center gap-2 text-left px-2 py-1 rounded text-[11px] hover:bg-white border ${
                          selected ? 'border-emerald-300 bg-emerald-50' : 'border-transparent'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${colorCls} flex-shrink-0`} />
                        <span className="font-medium text-slate-800">{c.alias}</span>
                        {c.last4 && <span className="text-slate-500 tabular-nums">···· {c.last4}</span>}
                        {selected && <span className="ml-auto text-emerald-700">선택됨 · 해제</span>}
                      </button>
                    </li>
                  )
                })}
            </ul>
          )}
          <div className="flex items-center justify-between pt-1 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[10px] text-slate-500 hover:text-slate-700"
            >
              닫기
            </button>
            {cardId && (
              <button
                type="button"
                disabled={busy}
                aria-busy={busy}
                onClick={() => assign(null)}
                className="text-[10px] text-rose-600 hover:text-rose-800"
              >
                매핑 해제
              </button>
            )}
          </div>
          <p role="status" aria-live="polite" className="sr-only">
            {busy ? '결제 카드 저장 중…' : ''}
          </p>
          {error && (
            <p role="alert" className="text-[11px] text-rose-600">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
