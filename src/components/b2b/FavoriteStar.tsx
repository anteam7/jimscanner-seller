'use client'

import { useState } from 'react'

type Props = {
  productId: string
  initial: boolean
  size?: 'sm' | 'md'
}

export default function FavoriteStar({ productId, initial, size = 'sm' }: Props) {
  const [isFavorite, setIsFavorite] = useState(initial)
  const [pending, setPending] = useState(false)
  const dim = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (pending) return
    const next = !isFavorite
    setPending(true)
    // optimistic
    setIsFavorite(next)
    try {
      const r = await fetch(`/api/products/${productId}/favorite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: next }),
      })
      if (!r.ok) setIsFavorite(!next)
    } catch {
      setIsFavorite(!next)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      aria-pressed={isFavorite}
      title={isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
      className={`inline-flex items-center justify-center rounded p-0.5 transition-colors ${
        isFavorite ? 'text-amber-500 hover:text-amber-600' : 'text-slate-300 hover:text-amber-400'
      } ${pending ? 'opacity-60' : ''}`}
    >
      {isFavorite ? (
        <svg className={`${dim} fill-current`} viewBox="0 0 20 20" aria-hidden="true">
          <path d="M9.04 2.927c.3-.92 1.62-.92 1.92 0l1.5 4.612h4.85c.969 0 1.371 1.24.588 1.81l-3.926 2.852 1.5 4.612c.3.921-.755 1.688-1.539 1.118L10 14.98l-3.926 2.852c-.784.57-1.838-.197-1.539-1.118l1.5-4.612L2.108 9.35c-.783-.57-.38-1.81.588-1.81h4.85l1.5-4.612z" />
        </svg>
      ) : (
        <svg className={dim} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.04 2.927c.3-.92 1.62-.92 1.92 0l1.5 4.612h4.85c.969 0 1.371 1.24.588 1.81l-3.926 2.852 1.5 4.612c.3.921-.755 1.688-1.539 1.118L10 14.98l-3.926 2.852c-.784.57-1.838-.197-1.539-1.118l1.5-4.612L2.108 9.35c-.783-.57-.38-1.81.588-1.81h4.85l1.5-4.612z" />
        </svg>
      )}
    </button>
  )
}
