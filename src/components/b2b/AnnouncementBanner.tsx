'use client'

import { useEffect, useRef, useState } from 'react'

type Announcement = {
  id: string
  type: 'urgent' | 'maintenance' | 'feature_update' | 'general'
  title: string
  body_markdown: string
  starts_at: string
  ends_at: string
}

const TYPE_STYLES: Record<Announcement['type'], { bar: string; badge: string; label: string }> = {
  urgent: {
    bar: 'bg-red-900/80 border-red-700/60 text-red-100',
    badge: 'bg-red-600 text-white',
    label: '긴급',
  },
  maintenance: {
    bar: 'bg-yellow-900/70 border-yellow-700/60 text-yellow-100',
    badge: 'bg-yellow-600 text-white',
    label: '점검',
  },
  feature_update: {
    bar: 'bg-blue-900/70 border-blue-700/60 text-blue-100',
    badge: 'bg-blue-600 text-white',
    label: '업데이트',
  },
  general: {
    bar: 'bg-slate-800/80 border-slate-700/60 text-slate-200',
    badge: 'bg-slate-600 text-slate-200',
    label: '공지',
  },
}

const TYPE_PRIORITY: Record<Announcement['type'], number> = {
  urgent: 0,
  maintenance: 1,
  feature_update: 2,
  general: 3,
}

function truncate(text: string, max: number) {
  const plain = text.replace(/[#*`[\]()_~>]/g, '').trim()
  return plain.length > max ? plain.slice(0, max) + '…' : plain
}

function ModalContent({
  ann,
  onClose,
}: {
  ann: Announcement
  onClose: () => void
}) {
  const style = TYPE_STYLES[ann.type]
  const closeRef = useRef<HTMLButtonElement>(null)

  // Auto-focus close button on mount so keyboard users immediately have a target
  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  // Escape key closes the modal (WCAG 2.1.2)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-xl bg-slate-900 border border-slate-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ann-modal-title"
      >
        <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-slate-700">
          <span className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-xs font-bold ${style.badge}`}>
            {style.label}
          </span>
          <h2 id="ann-modal-title" className="flex-1 text-base font-semibold text-slate-100">
            {ann.title}
          </h2>
          <button
            ref={closeRef}
            onClick={onClose}
            className="shrink-0 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
            aria-label="닫기"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4 max-h-96 overflow-y-auto">
          <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans leading-relaxed">
            {ann.body_markdown}
          </pre>
        </div>
        <div className="px-5 pb-4 text-xs text-slate-500">
          공지 기간: {new Date(ann.starts_at).toLocaleDateString('ko-KR')} ~{' '}
          {new Date(ann.ends_at).toLocaleDateString('ko-KR')}
        </div>
      </div>
    </div>
  )
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [modalAnn, setModalAnn] = useState<Announcement | null>(null)

  useEffect(() => {
    const stored = new Set<string>()
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('dismissed_ann_')) stored.add(key.slice('dismissed_ann_'.length))
    }
    setDismissed(stored)

    fetch('/api/announcements/active')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const sorted = [...data].sort(
            (a, b) => TYPE_PRIORITY[a.type as Announcement['type']] - TYPE_PRIORITY[b.type as Announcement['type']],
          )
          setAnnouncements(sorted)
        }
      })
      .catch(() => {})
  }, [])

  const visible = announcements.filter((a) => !dismissed.has(a.id))

  if (visible.length === 0) return null

  const ann = visible[0]
  const style = TYPE_STYLES[ann.type]

  function dismiss(id: string) {
    localStorage.setItem(`dismissed_ann_${id}`, '1')
    setDismissed((prev) => new Set([...prev, id]))
  }

  return (
    <>
      <div
        className={`flex items-center gap-3 px-4 py-2 border-b text-sm ${style.bar}`}
        role="status"
        aria-live="polite"
      >
        <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ${style.badge}`}>
          {style.label}
        </span>
        <span className="flex-1 min-w-0 truncate font-medium">{ann.title}</span>
        <span className="hidden sm:block shrink-0 opacity-75 truncate max-w-xs">
          {truncate(ann.body_markdown, 50)}
        </span>
        <button
          onClick={() => setModalAnn(ann)}
          className="shrink-0 underline underline-offset-2 hover:no-underline text-xs opacity-80 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-current rounded"
        >
          자세히 보기
        </button>
        <button
          onClick={() => dismiss(ann.id)}
          aria-label="공지 닫기"
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-current rounded"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {modalAnn && <ModalContent ann={modalAnn} onClose={() => setModalAnn(null)} />}
    </>
  )
}
