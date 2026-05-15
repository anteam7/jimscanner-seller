'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/auth/client'
import { SignupProgress } from '@/components/b2b/SignupProgress'
import { SignupHeader } from '@/components/b2b/SignupHeader'

// 사업자등록번호: 10자리 숫자 (하이픈 포함 입력 허용)
function formatBusinessNo(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
}

function stripBusinessNo(formatted: string): string {
  return formatted.replace(/\D/g, '')
}

// 전화번호 자동 포맷 (02-XXXX-XXXX 또는 0XX-XXXX-XXXX)
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

function validatePhone(phone: string): boolean {
  return /^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(phone.replace(/\s/g, ''))
}

interface FormState {
  businessNo: string
  businessName: string
  ceoName: string
  businessType: '개인사업자' | '법인사업자' | ''
  categoryMain: string
  categorySub: string
  phone: string
  postalCode: string
  address: string
  detailAddress: string
}

interface FieldErrors {
  businessNo?: string
  businessName?: string
  ceoName?: string
  businessType?: string
  categoryMain?: string
  categorySub?: string
  phone?: string
  postalCode?: string
  address?: string
}

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {}
  const digits = stripBusinessNo(form.businessNo)
  if (!digits) {
    errors.businessNo = '사업자등록번호를 입력해 주세요.'
  } else if (digits.length !== 10) {
    errors.businessNo = '사업자등록번호는 10자리 숫자여야 합니다.'
  }
  if (!form.businessName.trim()) errors.businessName = '상호를 입력해 주세요.'
  if (!form.ceoName.trim()) errors.ceoName = '대표자명을 입력해 주세요.'
  if (!form.businessType) errors.businessType = '사업자 유형을 선택해 주세요.'
  if (!form.categoryMain.trim()) errors.categoryMain = '업태를 입력해 주세요.'
  if (!form.categorySub.trim()) errors.categorySub = '종목을 입력해 주세요.'
  if (!form.phone.trim()) {
    errors.phone = '전화번호를 입력해 주세요.'
  } else if (!validatePhone(form.phone)) {
    errors.phone = '올바른 전화번호 형식을 입력해 주세요. (예: 010-1234-5678)'
  }
  if (!form.postalCode.trim()) errors.postalCode = '우편번호를 입력해 주세요.'
  if (!form.address.trim()) errors.address = '주소를 입력해 주세요.'
  return errors
}

function fieldCls(
  name: keyof FieldErrors,
  touchedErrors: FieldErrors,
  touched: Partial<Record<keyof FormState, boolean>>,
  extra = ''
) {
  const hasError = !!touchedErrors[name]
  const isValid = touched[name as keyof FormState] && !hasError
  return [
    'bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500 transition-colors',
    hasError ? 'border-red-600 focus-visible:ring-red-500' : isValid ? 'border-green-600' : 'border-slate-300',
    extra,
  ]
    .filter(Boolean)
    .join(' ')
}

function FieldError({ id, message }: { id?: string; message: string | undefined }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1 text-xs text-red-600" role="alert">
      {message}
    </p>
  )
}

export default function SignupStep4Page() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>({
    businessNo: '',
    businessName: '',
    ceoName: '',
    businessType: '',
    categoryMain: '',
    categorySub: '',
    phone: '',
    postalCode: '',
    address: '',
    detailAddress: '',
  })
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/signup/step-1')
      } else if (!data.user.email_confirmed_at) {
        router.replace('/signup/step-3')
      } else {
        setAuthLoading(false)
      }
    })
  }, [router])

  const fieldErrors = validate(form)
  const touchedErrors = Object.fromEntries(
    Object.entries(fieldErrors).filter(([k]) => touched[k as keyof FormState])
  ) as FieldErrors

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function touch(key: keyof FormState) {
    setTouched((prev) => ({ ...prev, [key]: true }))
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setSubmitError(null)

      const allTouched: Partial<Record<keyof FormState, boolean>> = {}
      ;(Object.keys(form) as (keyof FormState)[]).forEach((k) => { allTouched[k] = true })
      setTouched(allTouched)

      const errors = validate(form)
      if (Object.keys(errors).length > 0) return

      setLoading(true)
      const res = await fetch('/api/signup/business-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessNo: stripBusinessNo(form.businessNo),
          businessName: form.businessName.trim(),
          ceoName: form.ceoName.trim(),
          businessType: form.businessType,
          categoryMain: form.categoryMain.trim(),
          categorySub: form.categorySub.trim(),
          phone: form.phone.trim(),
          postalCode: form.postalCode.trim(),
          address: form.address.trim(),
          detailAddress: form.detailAddress.trim(),
        }),
      })
      setLoading(false)

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setSubmitError((body as { error?: string }).error ?? '저장에 실패했습니다. 다시 시도해 주세요.')
        return
      }

      router.push('/signup/step-5')
    },
    [form, router]
  )

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <SignupHeader />

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-10">
        <SignupProgress currentStep={3} />

        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-bold mb-1">사업자 정보 입력</h1>
          <p className="text-slate-400 text-sm mb-8">
            사업자등록증에 기재된 정보를 정확히 입력해 주세요.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* 사업자 유형 */}
            <fieldset>
              <legend className="block text-sm font-medium text-slate-500 mb-2">
                사업자 유형 <span className="text-red-600">*</span>
              </legend>
              <div className="flex gap-3">
                {(['개인사업자', '법인사업자'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { setField('businessType', type); touch('businessType') }}
                    aria-pressed={form.businessType === type}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors
                      ${form.businessType === type
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-slate-300 text-slate-500 hover:border-slate-500 hover:text-slate-900'
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <FieldError id="businessType-error" message={touchedErrors.businessType} />
            </fieldset>

            {/* 사업자등록번호 */}
            <div>
              <label htmlFor="businessNo" className="block text-sm font-medium text-slate-500 mb-1.5">
                사업자등록번호 <span className="text-red-600">*</span>
              </label>
              <Input
                id="businessNo"
                type="text"
                inputMode="numeric"
                placeholder="000-00-00000"
                value={form.businessNo}
                onChange={(e) => setField('businessNo', formatBusinessNo(e.target.value))}
                onBlur={() => touch('businessNo')}
                maxLength={12}
                aria-invalid={!!touchedErrors.businessNo}
                aria-describedby={touchedErrors.businessNo ? 'businessNo-error' : undefined}
                className={fieldCls('businessNo', touchedErrors, touched)}
              />
              <FieldError id="businessNo-error" message={touchedErrors.businessNo} />
            </div>

            {/* 상호 */}
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-slate-500 mb-1.5">
                상호 <span className="text-red-600">*</span>
              </label>
              <Input
                id="businessName"
                type="text"
                placeholder="예: 홍길동 직구샵"
                value={form.businessName}
                onChange={(e) => setField('businessName', e.target.value)}
                onBlur={() => touch('businessName')}
                aria-invalid={!!touchedErrors.businessName}
                aria-describedby={touchedErrors.businessName ? 'businessName-error' : undefined}
                className={fieldCls('businessName', touchedErrors, touched)}
              />
              <FieldError id="businessName-error" message={touchedErrors.businessName} />
            </div>

            {/* 대표자명 */}
            <div>
              <label htmlFor="ceoName" className="block text-sm font-medium text-slate-500 mb-1.5">
                대표자명 <span className="text-red-600">*</span>
              </label>
              <Input
                id="ceoName"
                type="text"
                autoComplete="name"
                placeholder="예: 홍길동"
                value={form.ceoName}
                onChange={(e) => setField('ceoName', e.target.value)}
                onBlur={() => touch('ceoName')}
                aria-invalid={!!touchedErrors.ceoName}
                aria-describedby={touchedErrors.ceoName ? 'ceoName-error' : undefined}
                className={fieldCls('ceoName', touchedErrors, touched)}
              />
              <FieldError id="ceoName-error" message={touchedErrors.ceoName} />
            </div>

            {/* 업태·종목 (2열) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="categoryMain" className="block text-sm font-medium text-slate-500 mb-1.5">
                  업태 <span className="text-red-600">*</span>
                </label>
                <Input
                  id="categoryMain"
                  type="text"
                  placeholder="예: 소매업"
                  value={form.categoryMain}
                  onChange={(e) => setField('categoryMain', e.target.value)}
                  onBlur={() => touch('categoryMain')}
                  aria-invalid={!!touchedErrors.categoryMain}
                  aria-describedby={touchedErrors.categoryMain ? 'categoryMain-error' : undefined}
                  className={fieldCls('categoryMain', touchedErrors, touched)}
                />
                <FieldError id="categoryMain-error" message={touchedErrors.categoryMain} />
              </div>
              <div>
                <label htmlFor="categorySub" className="block text-sm font-medium text-slate-500 mb-1.5">
                  종목 <span className="text-red-600">*</span>
                </label>
                <Input
                  id="categorySub"
                  type="text"
                  placeholder="예: 해외직구"
                  value={form.categorySub}
                  onChange={(e) => setField('categorySub', e.target.value)}
                  onBlur={() => touch('categorySub')}
                  aria-invalid={!!touchedErrors.categorySub}
                  aria-describedby={touchedErrors.categorySub ? 'categorySub-error' : undefined}
                  className={fieldCls('categorySub', touchedErrors, touched)}
                />
                <FieldError id="categorySub-error" message={touchedErrors.categorySub} />
              </div>
            </div>

            {/* 전화번호 */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-500 mb-1.5">
                사업장 전화번호 <span className="text-red-600">*</span>
              </label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="예: 010-1234-5678"
                value={form.phone}
                onChange={(e) => setField('phone', formatPhone(e.target.value))}
                onBlur={() => touch('phone')}
                aria-invalid={!!touchedErrors.phone}
                aria-describedby={touchedErrors.phone ? 'phone-error' : undefined}
                className={fieldCls('phone', touchedErrors, touched)}
              />
              <FieldError id="phone-error" message={touchedErrors.phone} />
            </div>

            {/* 주소 */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-500">
                사업장 주소 <span className="text-red-600">*</span>
              </label>
              <div className="flex gap-2">
                <Input
                  id="postalCode"
                  type="text"
                  inputMode="numeric"
                  placeholder="우편번호"
                  value={form.postalCode}
                  onChange={(e) => setField('postalCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onBlur={() => touch('postalCode')}
                  maxLength={6}
                  aria-invalid={!!touchedErrors.postalCode}
                  aria-describedby={touchedErrors.postalCode ? 'postalCode-error' : undefined}
                  className={fieldCls('postalCode', touchedErrors, touched, 'w-32')}
                />
              </div>
              <FieldError id="postalCode-error" message={touchedErrors.postalCode} />
              <Input
                id="address"
                type="text"
                placeholder="도로명 또는 지번 주소"
                value={form.address}
                onChange={(e) => setField('address', e.target.value)}
                onBlur={() => touch('address')}
                aria-invalid={!!touchedErrors.address}
                aria-describedby={touchedErrors.address ? 'address-error' : undefined}
                className={fieldCls('address', touchedErrors, touched)}
              />
              <FieldError id="address-error" message={touchedErrors.address} />
              <Input
                id="detailAddress"
                type="text"
                placeholder="상세 주소 (호수·층 등, 선택)"
                value={form.detailAddress}
                onChange={(e) => setField('detailAddress', e.target.value)}
                className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500"
              />
            </div>

            {submitError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
                {submitError}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-11 disabled:opacity-50"
            >
              {loading ? '저장 중…' : '다음 단계 — 사업자 진위 확인'}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-400">
            입력하신 사업자 정보는 다음 단계에서 국세청 API로 자동 검증됩니다.
          </p>
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-200">
        © 2026 짐스캐너. 사업자 서비스는 현재 베타 운영 중입니다.
      </footer>
    </div>
  )
}
