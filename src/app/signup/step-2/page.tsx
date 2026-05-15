'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/auth/client'
import { SignupProgress } from '@/components/b2b/SignupProgress'
import { SignupHeader } from '@/components/b2b/SignupHeader'

interface Term {
  id: string
  version_code: string
  category: string
  title: string
  body: string
  is_required: boolean
}

function TermRow({
  term,
  checked,
  onToggle,
}: {
  term: Term
  checked: boolean
  onToggle: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-slate-300 bg-white">
      <div className="flex items-start gap-3 px-4 py-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          onClick={onToggle}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
            ${checked ? 'bg-indigo-600 border-indigo-600' : 'bg-transparent border-slate-600 hover:border-slate-400'}`}
        >
          {checked && (
            <svg className="w-3 h-3 text-slate-900" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-900">{term.title}</span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded font-semibold
                ${term.is_required ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}
            >
              {term.is_required ? '필수' : '선택'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-xs text-slate-400 hover:text-slate-500 transition-colors"
          >
            {expanded ? '내용 접기 ▲' : '내용 보기 ▼'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="max-h-48 overflow-y-auto rounded bg-slate-50 border border-slate-200 p-3">
            <pre className="text-xs text-slate-400 whitespace-pre-wrap font-sans leading-relaxed">
              {term.body}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SignupStep2Page() {
  const router = useRouter()
  const [terms, setTerms] = useState<Term[]>([])
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    supabase
      .from('b2b_terms_versions')
      .select('id,version_code,category,title,body,is_required')
      .eq('is_active', true)
      .order('is_required', { ascending: false })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data, error: err }: any) => {
        if (err || !data) {
          setError('약관을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
        } else {
          const termList = data as Term[]
          setTerms(termList)
          const initial: Record<string, boolean> = {}
          termList.forEach((t) => { initial[t.id] = false })
          setChecked(initial)
        }
        setLoading(false)
      })
  }, [])

  const allRequired = terms.filter((t) => t.is_required)
  const allRequiredChecked = allRequired.every((t) => checked[t.id])
  const allChecked = terms.every((t) => checked[t.id])

  function toggleAll() {
    const next = !allChecked
    const updated: Record<string, boolean> = {}
    terms.forEach((t) => { updated[t.id] = next })
    setChecked(updated)
  }

  function toggleOne(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!allRequiredChecked) {
      setError('필수 약관에 모두 동의해야 합니다.')
      return
    }

    const consentedTermIds = Object.entries(checked)
      .filter(([, v]) => v)
      .map(([k]) => k)

    setSubmitting(true)
    const res = await fetch('/api/signup/terms-consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consentedTermIds }),
    })
    setSubmitting(false)

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError((body as { error?: string }).error ?? '저장에 실패했습니다. 다시 시도해 주세요.')
      return
    }

    router.push('/signup/step-3')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <SignupHeader />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <SignupProgress currentStep={1} />

        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold mb-1">약관 동의</h1>
          <p className="text-slate-400 text-sm mb-6">서비스 이용을 위해 약관에 동의해 주세요.</p>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 전체 동의 */}
              <button
                type="button"
                onClick={toggleAll}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-slate-300 bg-white hover:border-indigo-700 transition-colors"
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                    ${allChecked ? 'bg-indigo-600 border-indigo-600' : 'bg-transparent border-slate-600'}`}
                >
                  {allChecked && (
                    <svg className="w-3 h-3 text-slate-900" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="font-semibold text-slate-900">전체 동의 (필수·선택 포함)</span>
              </button>

              <div className="border-t border-slate-200" />

              {/* 개별 약관 */}
              <div className="space-y-2">
                {terms.map((term) => (
                  <TermRow
                    key={term.id}
                    term={term}
                    checked={checked[term.id] ?? false}
                    onToggle={() => toggleOne(term.id)}
                  />
                ))}
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting || !allRequiredChecked}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-11 disabled:opacity-50"
              >
                {submitting ? '저장 중…' : '동의하고 다음 단계로'}
              </Button>
            </form>
          )}
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-200">
        © 2026 짐스캐너. 사업자 서비스는 현재 베타 운영 중입니다.
      </footer>
    </div>
  )
}
