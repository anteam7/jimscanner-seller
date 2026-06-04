'use client'

import { useState, cloneElement, isValidElement, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'

type ForwarderRef = { name: string | null; slug: string | null }
type AddressRow = {
  id: string
  account_id: string | null
  forwarder_id: string
  label: string
  recipient_name: string
  phone: string | null
  address1: string
  address2: string | null
  city: string
  state: string
  zip: string
  country: string
  member_no: string | null
  is_official: boolean
  is_default: boolean
  notes: string | null
  created_at: string
  forwarders: ForwarderRef | null
}
type ForwarderOption = { id: string; name: string; slug: string }

const COUNTRIES = [
  { value: 'US', label: '미국 US' },
  { value: 'JP', label: '일본 JP' },
  { value: 'CN', label: '중국 CN' },
  { value: 'HK', label: '홍콩 HK' },
  { value: 'DE', label: '독일 DE' },
  { value: 'UK', label: '영국 UK' },
]

const COUNTRY_BADGE: Record<string, { flag: string; label: string }> = {
  US: { flag: '🇺🇸', label: '미국' },
  JP: { flag: '🇯🇵', label: '일본' },
  CN: { flag: '🇨🇳', label: '중국' },
  HK: { flag: '🇭🇰', label: '홍콩' },
  DE: { flag: '🇩🇪', label: '독일' },
  UK: { flag: '🇬🇧', label: '영국' },
  GB: { flag: '🇬🇧', label: '영국' },
  FR: { flag: '🇫🇷', label: '프랑스' },
  EU: { flag: '🇪🇺', label: '유럽' },
}

export default function ForwarderAddressManager({
  initialAddresses,
  forwarders,
}: {
  initialAddresses: AddressRow[]
  forwarders: ForwarderOption[]
}) {
  const router = useRouter()
  const [rows, setRows] = useState(initialAddresses)
  // router.refresh() 후 서버 props 갱신 시 client state 동기화 (React 19 권장 "store previous prop" 패턴 — useEffect 대신 render 중 set)
  const [prevInitial, setPrevInitial] = useState(initialAddresses)
  if (initialAddresses !== prevInitial) {
    setPrevInitial(initialAddresses)
    setRows(initialAddresses)
  }

  // POST/DELETE/PATCH 직후 즉시 반영 위한 직접 fetch
  async function reload() {
    try {
      const res = await fetch('/api/forwarder-addresses', { cache: 'no-store' })
      const json = (await res.json().catch(() => ({}))) as { addresses?: typeof initialAddresses }
      if (Array.isArray(json.addresses)) setRows(json.addresses)
    } catch {
      // ignore
    }
  }
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    forwarder_id: forwarders[0]?.id ?? '',
    label: '',
    recipient_name: '',
    phone: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
    member_no: '',
    is_default: false,
    notes: '',
  })

  function resetForm() {
    setForm({
      forwarder_id: forwarders[0]?.id ?? '',
      label: '',
      recipient_name: '',
      phone: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zip: '',
      country: 'US',
      member_no: '',
      is_default: false,
      notes: '',
    })
    setError(null)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const isEdit = editingId != null
      const res = await fetch(
        isEdit ? `/api/forwarder-addresses/${editingId}` : '/api/forwarder-addresses',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
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

  function startEdit(r: AddressRow) {
    setForm({
      forwarder_id: r.forwarder_id,
      label: r.label ?? '',
      recipient_name: r.recipient_name ?? '',
      phone: r.phone ?? '',
      address1: r.address1 ?? '',
      address2: r.address2 ?? '',
      city: r.city ?? '',
      state: r.state ?? '',
      zip: r.zip ?? '',
      country: r.country ?? 'US',
      member_no: r.member_no ?? '',
      is_default: r.is_default,
      notes: r.notes ?? '',
    })
    setEditingId(r.id)
    setAdding(true)
    setError(null)
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    }
  }

  // 공용 주소를 본인 주소로 복사 (POST 새 row). placeholder 텍스트는 비워서
  // 셀러가 영문이름/회원번호를 채우게 함.
  function copyOfficialToMine(r: AddressRow) {
    const placeholderLike = /\(.*입력 필요.*\)|회원번호|会員番号/i
    const cleanRecipient = placeholderLike.test(r.recipient_name) ? '' : r.recipient_name
    setForm({
      forwarder_id: r.forwarder_id,
      label: r.label.replace(/^[^\s]+\s/, '내 ') || '내 주소',
      recipient_name: cleanRecipient,
      phone: r.phone ?? '',
      address1: r.address1,
      address2: r.address2 ?? '',
      city: r.city,
      state: r.state,
      zip: r.zip,
      country: r.country,
      member_no: '',
      is_default: false,
      notes: r.notes ? `(${r.label} 기반)` : '',
    })
    setEditingId(null) // POST 로 새 row
    setAdding(true)
    setError(null)
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    }
  }

  async function setDefault(id: string) {
    await fetch(`/api/forwarder-addresses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_default: true }),
    })
    await reload()
    router.refresh()
  }

  async function remove(id: string) {
    if (!confirm('이 주소를 삭제할까요?')) return
    const res = await fetch(`/api/forwarder-addresses/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      alert(json.error ?? '실패')
      return
    }
    await reload()
    router.refresh()
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-900">주소 목록 ({rows.length}건)</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="h-9 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
          >
            + 주소 추가
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={onSubmit} className="rounded-lg bg-white shadow-sm border border-slate-200 p-5 space-y-3">
          <div className="pb-2 mb-1 border-b border-slate-100 text-sm font-bold text-slate-900">
            {editingId ? '주소 수정' : '새 주소 추가'}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="배대지" required>
              <select
                value={form.forwarder_id}
                onChange={(e) => setForm({ ...form, forwarder_id: e.target.value })}
                className={inputCls}
              >
                {forwarders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="라벨 (구분용)" required>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="예: 짐패스 LA 창고"
                className={inputCls}
              />
            </Field>
            <Field label="수신자명 (영문)" required>
              <input
                type="text"
                value={form.recipient_name}
                onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                placeholder="JOHN DOE"
                className={inputCls}
              />
            </Field>
            <Field label="전화">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 213 555 1234"
                className={inputCls}
              />
            </Field>
            <Field label="Address Line 1" required className="sm:col-span-2">
              <input
                type="text"
                value={form.address1}
                onChange={(e) => setForm({ ...form, address1: e.target.value })}
                placeholder="123 Main St"
                className={inputCls}
              />
            </Field>
            <Field label="Address Line 2" className="sm:col-span-2">
              <input
                type="text"
                value={form.address2}
                onChange={(e) => setForm({ ...form, address2: e.target.value })}
                placeholder="Suite 100 / 회원번호 JIMSCANNER123"
                className={inputCls}
              />
            </Field>
            <Field label="City" required>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Los Angeles"
                className={inputCls}
              />
            </Field>
            <Field label="State / 都道府県" required>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="CA"
                className={inputCls}
              />
            </Field>
            <Field label="ZIP" required>
              <input
                type="text"
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
                placeholder="90001"
                className={inputCls}
              />
            </Field>
            <Field label="국가" required>
              <select
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className={inputCls}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="회원번호 (선택)">
              <input
                type="text"
                value={form.member_no}
                onChange={(e) => setForm({ ...form, member_no: e.target.value })}
                placeholder="JIMSCANNER123"
                className={inputCls}
              />
            </Field>
            <Field label="메모 (선택)" className="sm:col-span-2">
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="..."
                className={inputCls}
              />
            </Field>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
              className="rounded border-slate-300"
            />
            <span>기본 주소로 설정 (확장이 우선 추천)</span>
          </label>

          {/* async 저장 진행 announce (항상 DOM 존재, sr-only — 시각·레이아웃 무변경) */}
          <p role="status" aria-live="polite" className="sr-only">
            {busy ? '배대지 주소 저장 중…' : ''}
          </p>
          {/* 저장/수정 실패 announce (항상 DOM 존재, 비활성 시 sr-only) */}
          <p role="alert" className={error ? 'text-xs text-rose-700' : 'sr-only'}>
            {error ?? ''}
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setAdding(false)
                setEditingId(null)
                resetForm()
              }}
              disabled={busy}
              className="h-9 px-4 text-sm text-slate-700 hover:text-slate-900 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={busy}
              aria-busy={busy}
              className="h-9 px-5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded"
            >
              {busy ? '저장 중…' : editingId ? '수정 저장' : '저장'}
            </button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <div className="rounded-lg bg-white shadow-sm border border-dashed border-slate-200 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-slate-700">등록된 주소가 없습니다.</p>
          <p className="mt-1 text-xs text-slate-500">위의 [+ 주소 추가] 로 첫 배대지 주소를 등록해 주세요.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className={`rounded-lg bg-white shadow-sm border border-slate-200 border-l-[3px] ${
                r.is_default ? 'border-l-emerald-500' : r.is_official ? 'border-l-sky-500' : 'border-l-indigo-500'
              } px-5 py-3`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {(() => {
                      const cb = COUNTRY_BADGE[r.country] ?? { flag: '🌐', label: r.country }
                      return (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded"
                          title={`${cb.label} (${r.country})`}
                        >
                          <span className="text-[11px] leading-none">{cb.flag}</span>
                          {cb.label}
                        </span>
                      )
                    })()}
                    <span className="text-sm font-semibold text-slate-900">{r.label}</span>
                    {r.forwarders?.name && (
                      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded">
                        {r.forwarders.name}
                      </span>
                    )}
                    {r.is_official && (
                      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded">
                        공식
                      </span>
                    )}
                    {r.is_default && (
                      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded">
                        기본
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700">{r.recipient_name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 break-all">
                    {[r.address1, r.address2].filter(Boolean).join(', ')}
                    {', '}
                    {r.city}, {r.state} {r.zip} {r.country}
                  </p>
                  {(r.phone || r.member_no) && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {r.phone && <>📞 {r.phone}</>}
                      {r.phone && r.member_no && ' · '}
                      {r.member_no && <>회원번호 {r.member_no}</>}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {r.is_official ? (
                    <button
                      type="button"
                      onClick={() => copyOfficialToMine(r)}
                      className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-800 hover:underline underline-offset-2 whitespace-nowrap"
                      title="이 주소를 기반으로 본인 주소를 추가합니다 (영문이름·회원번호만 채우세요)"
                    >
                      내 주소로 추가
                    </button>
                  ) : r.account_id != null ? (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-800 hover:underline underline-offset-2"
                      >
                        수정
                      </button>
                      {!r.is_default && (
                        <button
                          type="button"
                          onClick={() => setDefault(r.id)}
                          className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline underline-offset-2"
                        >
                          기본 설정
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        className="text-[10px] font-semibold text-rose-700 hover:text-rose-800 hover:underline underline-offset-2"
                      >
                        삭제
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const inputCls =
  'block w-full h-9 px-3 text-sm bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500'

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string
  required?: boolean
  className?: string
  children: React.ReactNode
}) {
  // 필수 표시(★)는 시각 신호만이라 스크린리더가 필수 여부를 announce 못함.
  // required 일 때 자식 컨트롤에 aria-required 를 주입 (시각·동작 무변경, WCAG 3.3.2/4.1.2).
  const control =
    required && isValidElement(children)
      ? cloneElement(children as ReactElement<{ 'aria-required'?: boolean }>, { 'aria-required': true })
      : children
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="block text-[11px] font-semibold text-slate-700 mb-1">
        {label}
        {required && <span className="text-rose-500 ml-0.5">★</span>}
      </span>
      {control}
    </label>
  )
}
