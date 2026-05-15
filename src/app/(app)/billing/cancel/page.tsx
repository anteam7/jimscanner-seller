'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const REASONS = ['기능 부족', '가격 부담', '사업 중단', '타 서비스 이전', '기타'] as const
type Reason = (typeof REASONS)[number]

type Step = 'select_reason' | 'offer' | 'confirm' | 'done'

function formatPeriodEnd(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

export default function BillingCancelPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('select_reason')
  const [reason, setReason] = useState<Reason | ''>('')
  const [detail, setDetail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [periodEnd, setPeriodEnd] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/billing/cancel')
      .then((r) => r.json())
      .then((d) => {
        if (d.period_end) setPeriodEnd(d.period_end as string)
      })
      .catch(() => {
        /* period_end 없이 진행 */
      })
  }, [])

  async function handleReasonSubmit() {
    if (!reason) {
      setError('취소 이유를 선택해 주세요.')
      return
    }
    if (reason === '기타' && !detail.trim()) {
      setError('기타 사유를 입력해 주세요.')
      return
    }
    setError('')
    setStep('offer')
  }

  async function handleOfferAccept() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, reason_detail: detail, accept_offer: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '오류가 발생했습니다.')
        return
      }
      router.push('/pricing?offer=accepted')
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function handleOfferDecline() {
    setStep('confirm')
  }

  async function handleCancelConfirm() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, reason_detail: detail, accept_offer: false }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '오류가 발생했습니다.')
        return
      }
      setStep('done')
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const formattedEnd = formatPeriodEnd(periodEnd)

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-4">
            <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">구독 취소</h1>
          <p className="mt-1 text-sm text-slate-400">짐스캐너 B2B를 떠나시는 이유를 알려주세요</p>
        </div>

        {/* Step: 이유 선택 */}
        {step === 'select_reason' && (
          <div className="bg-white border border-slate-300 rounded-2xl p-6 space-y-4">
            <p className="text-sm font-medium text-slate-500">취소 이유 선택 <span className="text-red-600">*</span></p>
            <div className="space-y-2" role="radiogroup" aria-label="취소 이유">
              {REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                    reason === r
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-300 hover:border-slate-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancel_reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => { setReason(r); setError('') }}
                    className="accent-indigo-500"
                  />
                  <span className="text-sm text-slate-800">{r}</span>
                </label>
              ))}
            </div>

            {reason === '기타' && (
              <div className="space-y-1">
                <textarea
                  placeholder="기타 사유를 입력해 주세요 (필수)"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-600 rounded-lg text-sm text-slate-800 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
                <p className={`text-right text-xs ${detail.length >= 500 ? 'text-red-600' : 'text-slate-400'}`}>
                  {detail.length}/500
                </p>
              </div>
            )}

            {error && (
              <p role="alert" className="text-xs text-red-600">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push('/pricing')}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-600 text-sm font-medium text-slate-500 hover:bg-slate-100 transition-colors"
              >
                취소하지 않기
              </button>
              <button
                type="button"
                onClick={handleReasonSubmit}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-700 hover:bg-red-600 text-sm font-medium text-white transition-colors"
              >
                다음 단계
              </button>
            </div>
          </div>
        )}

        {/* Step: 오퍼 모달 */}
        {step === 'offer' && (
          <div className="bg-white border border-indigo-600 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v13m0-13V6a4 4 0 10-4 4h4zm0 0a4 4 0 104 4V8" />
                </svg>
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">잠깐, 특별 혜택을 드릴게요</p>
                <p className="text-xs text-slate-400 mt-0.5">지금 취소를 보류하시면 아래 혜택을 드립니다</p>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-indigo-400" />
                <span className="text-sm font-semibold text-indigo-700">3개월간 30% 요금 할인</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-indigo-400" />
                <span className="text-sm text-slate-500">구독 기간 3개월 연장</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-indigo-400" />
                <span className="text-sm text-slate-500">모든 기능 그대로 유지</span>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-xs text-red-600">{error}</p>
            )}

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleOfferAccept}
                disabled={loading}
                className="w-full px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-semibold text-white transition-colors"
              >
                {loading ? '처리 중…' : '30% 할인 받고 계속 이용하기'}
              </button>
              <button
                type="button"
                onClick={handleOfferDecline}
                disabled={loading}
                className="w-full px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-500 transition-colors"
              >
                혜택 없이 취소 진행
              </button>
              <button
                type="button"
                onClick={() => setStep('select_reason')}
                disabled={loading}
                className="w-full px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-400 transition-colors"
              >
                ← 이유 다시 선택
              </button>
            </div>
          </div>
        )}

        {/* Step: 최종 확인 */}
        {step === 'confirm' && (
          <div className="bg-white border border-slate-300 rounded-2xl p-6 space-y-5">
            <div className="text-center space-y-2">
              <p className="text-base font-semibold text-slate-900">정말 취소하시겠습니까?</p>
              <p className="text-sm text-slate-400 leading-relaxed">
                취소 후에도 현재 구독 기간이 끝날 때까지 서비스를 이용하실 수 있습니다.
                취소 확인 이메일이 발송됩니다.
              </p>
            </div>

            <div className="bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 space-y-2">
              <div>
                <p className="text-xs text-slate-400">선택한 취소 이유</p>
                <p className="text-sm font-medium text-slate-500 mt-0.5">
                  {reason === '기타' && detail ? `기타: ${detail}` : reason}
                </p>
              </div>
              {formattedEnd && (
                <div className="pt-1 border-t border-slate-300">
                  <p className="text-xs text-slate-400">서비스 이용 가능 기간</p>
                  <p className="text-sm font-medium text-slate-500 mt-0.5">
                    {formattedEnd}까지 이용 가능합니다
                  </p>
                </div>
              )}
            </div>

            {error && (
              <p role="alert" className="text-xs text-red-600">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('offer')}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-600 text-sm font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-50 transition-colors"
              >
                이전
              </button>
              <button
                type="button"
                onClick={handleCancelConfirm}
                disabled={loading}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 text-sm font-semibold text-white transition-colors"
              >
                {loading ? '처리 중…' : '구독 취소 확정'}
              </button>
            </div>
          </div>
        )}

        {/* Step: 완료 */}
        {step === 'done' && (
          <div className="bg-white border border-slate-300 rounded-2xl p-8 text-center space-y-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100">
              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">구독이 취소되었습니다</p>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                {formattedEnd
                  ? `${formattedEnd}까지 서비스를 계속 이용하실 수 있습니다.`
                  : '현재 구독 기간 종료 시까지 서비스를 계속 이용하실 수 있습니다.'}
                {' '}취소 확인 이메일을 발송했습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2.5 rounded-lg bg-slate-300 hover:bg-slate-600 text-sm font-medium text-slate-900 transition-colors"
            >
              대시보드로 이동
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
