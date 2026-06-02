'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type CardRow = {
  id: string
  account_id: string
  alias: string
  brand: string | null
  last4: string | null
  color: string | null
  credit_limit_krw: number | null
  billing_day: number | null
  sort_order: number
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

const BRANDS: { value: string; label: string }[] = [
  { value: '', label: '미지정' },
  { value: 'visa', label: 'Visa' },
  { value: 'master', label: 'Master' },
  { value: 'amex', label: 'American Express' },
  { value: 'jcb', label: 'JCB' },
  { value: 'unionpay', label: 'UnionPay' },
  { value: 'domestic', label: '국내전용' },
  { value: 'other', label: '기타' },
]

const BRAND_LABEL: Record<string, string> = Object.fromEntries(
  BRANDS.filter((b) => b.value).map((b) => [b.value, b.label]),
)

const COLOR_PRESETS = [
  { key: 'indigo', cls: 'bg-indigo-500' },
  { key: 'emerald', cls: 'bg-emerald-500' },
  { key: 'amber', cls: 'bg-amber-500' },
  { key: 'rose', cls: 'bg-rose-500' },
  { key: 'sky', cls: 'bg-sky-500' },
  { key: 'slate', cls: 'bg-slate-700' },
]

const COLOR_CLS: Record<string, string> = Object.fromEntries(
  COLOR_PRESETS.map((p) => [p.key, p.cls]),
)

const inputCls =
  'w-full h-9 px-3 text-sm text-slate-900 placeholder:text-slate-400 bg-white border border-slate-300 rounded focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200'

type FormState = {
  alias: string
  brand: string
  last4: string
  color: string
  credit_limit_krw: string
  billing_day: string
  notes: string
}

const EMPTY_FORM: FormState = {
  alias: '',
  brand: '',
  last4: '',
  color: 'indigo',
  credit_limit_krw: '',
  billing_day: '',
  notes: '',
}

type CardSpend = { krw: number; lineCount: number }

export default function PaymentCardsManager({
  initialCards,
  spendByCard = {},
}: {
  initialCards: CardRow[]
  spendByCard?: Record<string, CardSpend>
}) {
  const router = useRouter()
  const [rows, setRows] = useState(initialCards)
  const [prevInitial, setPrevInitial] = useState(initialCards)
  if (initialCards !== prevInitial) {
    setPrevInitial(initialCards)
    setRows(initialCards)
  }

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  async function reload() {
    try {
      const res = await fetch('/api/payment-cards', { cache: 'no-store' })
      const json = (await res.json().catch(() => ({}))) as { cards?: CardRow[] }
      if (Array.isArray(json.cards)) setRows(json.cards)
    } catch {
      // ignore
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setError(null)
  }

  function startAdd() {
    resetForm()
    setEditingId(null)
    setAdding(true)
  }

  function startEdit(c: CardRow) {
    setForm({
      alias: c.alias,
      brand: c.brand ?? '',
      last4: c.last4 ?? '',
      color: c.color ?? 'indigo',
      credit_limit_krw: c.credit_limit_krw == null ? '' : String(c.credit_limit_krw),
      billing_day: c.billing_day == null ? '' : String(c.billing_day),
      notes: c.notes ?? '',
    })
    setEditingId(c.id)
    setAdding(true)
    setError(null)
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const payload = {
        alias: form.alias.trim(),
        brand: form.brand || null,
        last4: form.last4.trim() || null,
        color: form.color || null,
        credit_limit_krw: form.credit_limit_krw.trim() === '' ? null : Number(form.credit_limit_krw),
        billing_day: form.billing_day.trim() === '' ? null : Number(form.billing_day),
        notes: form.notes.trim() || null,
      }
      const isEdit = editingId != null
      const res = await fetch(
        isEdit ? `/api/payment-cards/${editingId}` : '/api/payment-cards',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !json.ok) {
        setError(json.error ?? (isEdit ? '수정 실패' : '저장 실패'))
        return
      }
      resetForm()
      setAdding(false)
      setEditingId(null)
      await reload()
      router.refresh()
    } catch {
      setError('네트워크 오류')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(c: CardRow) {
    try {
      await fetch(`/api/payment-cards/${c.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !c.is_active }),
      })
      await reload()
      router.refresh()
    } catch {
      alert('네트워크 오류로 카드 상태를 변경하지 못했습니다.')
    }
  }

  async function remove(c: CardRow) {
    if (!confirm(`'${c.alias}' 카드를 삭제할까요? 기존 매입 라인의 매핑은 유지됩니다.`)) return
    try {
      const res = await fetch(`/api/payment-cards/${c.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string }
        alert(json.error ?? '삭제 실패')
        return
      }
      await reload()
      router.refresh()
    } catch {
      alert('네트워크 오류로 카드를 삭제하지 못했습니다.')
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">카드 목록 ({rows.length}장)</h2>
        {!adding && (
          <button
            type="button"
            onClick={startAdd}
            className="h-9 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
          >
            + 카드 추가
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={onSubmit} className="rounded-lg bg-white shadow-sm border border-slate-200 p-5 space-y-3">
          <div className="pb-2 mb-1 border-b border-slate-100 text-sm font-bold text-slate-900">
            {editingId ? '카드 수정' : '새 카드 추가'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="별칭" required className="sm:col-span-2">
              <input
                type="text"
                value={form.alias}
                onChange={(e) => setForm({ ...form, alias: e.target.value })}
                placeholder="예: 신한 BC, 회사 법인카드"
                className={inputCls}
                maxLength={60}
                required
              />
            </Field>
            <Field label="브랜드">
              <select
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className={inputCls}
              >
                {BRANDS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </Field>
            <Field label="마지막 4자리">
              <input
                type="text"
                inputMode="numeric"
                value={form.last4}
                onChange={(e) => setForm({ ...form, last4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                placeholder="예: 1234"
                className={inputCls}
                maxLength={4}
              />
            </Field>
            <Field label="카드 한도 (KRW, 옵션)">
              <input
                type="text"
                inputMode="numeric"
                value={form.credit_limit_krw}
                onChange={(e) => setForm({ ...form, credit_limit_krw: e.target.value.replace(/[^\d]/g, '') })}
                placeholder="예: 3000000"
                className={inputCls}
              />
            </Field>
            <Field label="결제일 (1~31, 옵션)">
              <input
                type="text"
                inputMode="numeric"
                value={form.billing_day}
                onChange={(e) => setForm({ ...form, billing_day: e.target.value.replace(/\D/g, '').slice(0, 2) })}
                placeholder="예: 25"
                className={inputCls}
                maxLength={2}
              />
            </Field>
            <Field label="색상" className="sm:col-span-2">
              <div className="flex gap-2 flex-wrap">
                {COLOR_PRESETS.map((p) => (
                  <button
                    type="button"
                    key={p.key}
                    onClick={() => setForm({ ...form, color: p.key })}
                    className={`relative w-8 h-8 rounded-full ${p.cls} transition-all ${
                      form.color === p.key ? 'ring-2 ring-offset-2 ring-slate-700' : 'opacity-60 hover:opacity-100'
                    }`}
                    aria-label={`색상 ${p.key}`}
                  />
                ))}
              </div>
            </Field>
            <Field label="메모" className="sm:col-span-2">
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="예: 12개월 무이자 가능 / 해외결제 수수료 3%"
                className={inputCls}
                maxLength={500}
              />
            </Field>
          </div>

          {/* async 저장 진행 announce (항상 DOM 존재, sr-only — 시각·레이아웃 무변경) */}
          <p role="status" aria-live="polite" className="sr-only">
            {busy ? (editingId ? '카드 정보 수정 중…' : '카드 저장 중…') : ''}
          </p>
          {/* 저장/수정 실패 announce (항상 DOM 존재, 비활성 시 sr-only — 시각·레이아웃 무변경) */}
          <p role="alert" className={error ? 'text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded px-3 py-2' : 'sr-only'}>
            {error ?? ''}
          </p>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={busy}
              aria-busy={busy}
              className="h-9 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-60 transition-colors"
            >
              {busy ? '저장 중…' : editingId ? '수정' : '저장'}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm()
                setAdding(false)
                setEditingId(null)
              }}
              className="h-9 px-4 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <div className="rounded-lg bg-white shadow-sm border border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-600">등록된 카드가 없습니다.</p>
          <p className="text-xs text-slate-400 mt-1">매입에 사용하는 카드를 등록하면 카드별 매입 합계를 추적할 수 있습니다.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => {
            const colorCls = c.color && COLOR_CLS[c.color] ? COLOR_CLS[c.color] : 'bg-slate-400'
            const brandLabel = c.brand ? BRAND_LABEL[c.brand] ?? c.brand : null
            const spend = spendByCard[c.id]
            const usedKrw = spend?.krw ?? 0
            const hasLimit = c.credit_limit_krw != null && c.credit_limit_krw > 0
            const usagePct = hasLimit
              ? Math.min(999, Math.round((usedKrw / (c.credit_limit_krw as number)) * 100))
              : null
            const barCls =
              usagePct == null
                ? ''
                : usagePct >= 100
                  ? 'bg-rose-500'
                  : usagePct >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
            return (
              <li
                key={c.id}
                className={`rounded-lg bg-white shadow-sm border border-slate-200 px-4 py-3 flex items-start gap-3 ${
                  c.is_active ? '' : 'opacity-60'
                }`}
              >
                <div className={`w-2 h-12 rounded ${colorCls} flex-shrink-0 mt-0.5`} aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900 truncate">{c.alias}</p>
                    {brandLabel && (
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                        {brandLabel}
                      </span>
                    )}
                    {c.last4 && (
                      <span className="text-[11px] text-slate-500 tabular-nums">···· {c.last4}</span>
                    )}
                    {!c.is_active && (
                      <span className="text-[10px] text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">보관</span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-3 flex-wrap text-[11px] text-slate-500">
                    {c.credit_limit_krw != null && (
                      <span>한도 {c.credit_limit_krw.toLocaleString()}원</span>
                    )}
                    {c.billing_day != null && <span>결제일 매월 {c.billing_day}일</span>}
                  </div>
                  {c.is_active && (
                    <div className="mt-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">
                          이달 매입{' '}
                          <span className="font-semibold text-slate-700 tabular-nums">
                            {usedKrw.toLocaleString()}원
                          </span>
                          {spend && spend.lineCount > 0 && (
                            <span className="text-slate-400"> · {spend.lineCount}건</span>
                          )}
                        </span>
                        {usagePct != null && (
                          <span
                            className={`font-semibold tabular-nums ${
                              usagePct >= 100 ? 'text-rose-600' : usagePct >= 80 ? 'text-amber-600' : 'text-slate-500'
                            }`}
                          >
                            {usagePct}%{usagePct >= 100 ? ' 초과' : ''}
                          </span>
                        )}
                      </div>
                      {usagePct != null && (
                        <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barCls}`}
                            style={{ width: `${Math.min(100, usagePct)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {c.notes && <p className="mt-1 text-[11px] text-slate-500">{c.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(c)}
                    className="text-[11px] text-slate-500 hover:text-slate-700"
                  >
                    {c.is_active ? '보관' : '복귀'}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(c)}
                    className="text-[11px] text-rose-600 hover:text-rose-800"
                  >
                    삭제
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function Field({
  label,
  required,
  className = '',
  children,
}: {
  label: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[11px] font-semibold text-slate-600">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
