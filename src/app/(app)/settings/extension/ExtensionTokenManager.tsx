'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type TokenRow = {
  id: string
  label: string
  token_prefix: string
  last_used_at: string | null
  created_at: string
  revoked_at: string | null
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}.${mm}.${dd}`
}

export default function ExtensionTokenManager({ initialTokens }: { initialTokens: TokenRow[] }) {
  const router = useRouter()
  const [tokens, setTokens] = useState(initialTokens)
  const [label, setLabel] = useState('browser-extension')
  const [newToken, setNewToken] = useState<string | null>(null)
  const [issuing, setIssuing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function issue() {
    setIssuing(true)
    setError(null)
    setNewToken(null)
    try {
      const res = await fetch('/api/seller-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean; token?: string; id?: string; label?: string; prefix?: string; created_at?: string; error?: string
      }
      if (!res.ok || !json.ok || !json.token) {
        setError(json.error ?? '발급 실패')
        return
      }
      setNewToken(json.token)
      setTokens((prev) => [
        {
          id: json.id ?? '',
          label: json.label ?? 'browser-extension',
          token_prefix: json.prefix ?? '',
          last_used_at: null,
          created_at: json.created_at ?? new Date().toISOString(),
          revoked_at: null,
        },
        ...prev,
      ])
    } catch {
      setError('네트워크 오류')
    } finally {
      setIssuing(false)
    }
  }

  async function revoke(id: string) {
    if (!confirm('이 토큰을 사용 중지하시겠습니까? 확장에 저장된 동일 토큰은 즉시 실패합니다.')) return
    const res = await fetch(`/api/seller-tokens?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      alert(json.error ?? '실패')
      return
    }
    setTokens((prev) =>
      prev.map((t) => (t.id === id ? { ...t, revoked_at: new Date().toISOString() } : t)),
    )
    router.refresh()
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // ignore
    }
  }

  return (
    <section className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">API 토큰</h2>
          <p className="mt-0.5 text-xs text-slate-500">확장이 짐스캐너에 데이터를 보낼 때 사용합니다.</p>
        </div>
      </div>

      <div className="px-5 py-4 border-b border-slate-100 space-y-3">
        <label className="block">
          <span className="block text-[11px] font-semibold text-slate-700 mb-1">라벨 (구분용)</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, 80))}
            placeholder="browser-extension"
            className="block w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </label>
        <button
          type="button"
          onClick={issue}
          disabled={issuing}
          className="h-9 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded transition-colors"
        >
          {issuing ? '발급 중…' : '새 토큰 발급'}
        </button>
        {error && <p className="text-xs text-rose-700">{error}</p>}

        {newToken && (
          <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
            <p className="text-xs font-bold text-amber-900">
              ⚠ 이 토큰은 지금만 표시됩니다. 안전한 곳에 복사해 두세요.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-2 py-1.5 text-[11px] font-mono text-slate-900 bg-white border border-slate-200 rounded break-all">
                {newToken}
              </code>
              <button
                type="button"
                onClick={() => copy(newToken)}
                className="h-8 px-3 text-[11px] font-semibold text-indigo-700 bg-white border border-indigo-200 hover:bg-indigo-50 rounded transition-colors"
              >
                복사
              </button>
            </div>
          </div>
        )}
      </div>

      {tokens.length === 0 ? (
        <div className="px-5 py-8 text-center text-xs text-slate-500">발급된 토큰이 없습니다.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-semibold">
            <tr>
              <th className="px-4 py-2.5 text-left">라벨</th>
              <th className="px-4 py-2.5 text-left">Prefix</th>
              <th className="px-4 py-2.5 text-left">발급</th>
              <th className="px-4 py-2.5 text-left">마지막 사용</th>
              <th className="px-4 py-2.5 text-left">상태</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tokens.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-2.5 text-slate-900">{t.label}</td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-slate-700">{t.token_prefix}…</td>
                <td className="px-4 py-2.5 text-[11px] text-slate-600 tabular-nums">{formatDate(t.created_at)}</td>
                <td className="px-4 py-2.5 text-[11px] text-slate-600 tabular-nums">{formatDate(t.last_used_at)}</td>
                <td className="px-4 py-2.5">
                  {t.revoked_at ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 rounded">
                      revoke됨
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded">
                      활성
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {!t.revoked_at && (
                    <button
                      type="button"
                      onClick={() => revoke(t.id)}
                      className="text-[11px] font-semibold text-rose-700 hover:text-rose-800 hover:underline underline-offset-2"
                    >
                      사용 중지
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
