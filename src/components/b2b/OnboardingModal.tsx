'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type Props = {
  ceoName: string | null
  displayName: string
  isNewSeller: boolean
}

const DISMISS_KEY = 'jimscanner_b2b_onboarding_v1_dismissed'

export default function OnboardingModal({ ceoName, displayName, isNewSeller }: Props) {
  const [open, setOpen] = useState(false)
  const firstLinkRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (!isNewSeller) return
    try {
      const dismissed = window.localStorage.getItem(DISMISS_KEY)
      // 1회성 mount 시 localStorage 동기화 — cascading render 위험 없음
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (!dismissed) setOpen(true)
    } catch {
      // localStorage unavailable (private mode 등) — 그냥 안 띄움
    }
  }, [isNewSeller])

  useEffect(() => {
    if (!open) return
    // 열림 시 모달 안 첫 인터랙티브 컨트롤로 포커스 이동, 닫힘 시 직전 포커스 복귀
    // (자동 마운트 모달이라 트리거 버튼이 없음 → 열림 시점의 activeElement 캡처)
    const previouslyFocused = document.activeElement as HTMLElement | null
    firstLinkRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previouslyFocused?.focus?.()
    }
  }, [open])

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, new Date().toISOString())
    } catch {
      // ignore
    }
    setOpen(false)
  }

  if (!open) return null

  const greetName = ceoName ?? displayName

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden">
        {/* 헤더 — 그라데이션 */}
        <div className="relative bg-gradient-to-br from-indigo-500 via-indigo-600 to-sky-600 px-6 pt-7 pb-6 text-white">
          <button
            type="button"
            onClick={dismiss}
            className="absolute top-3 right-3 text-white/70 hover:text-white p-2 rounded-md hover:bg-white/10 transition-colors"
            aria-label="닫기"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-100/90 mb-1">
            Welcome to Jimscanner Seller
          </p>
          <h2 id="onboarding-title" className="text-xl font-bold leading-tight">
            환영합니다{greetName ? `, ${greetName}님` : ''} 👋
          </h2>
          <p className="text-sm text-indigo-50 mt-2 leading-relaxed">
            마켓 주문 1건을 33개 배대지 양식으로 30초 만에 변환합니다.
            <br />첫 셋업만 끝내면 다음 주문부터는 자동입니다.
          </p>
        </div>

        {/* 본문 — 3 핵심 단계 */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            먼저 셋업할 3가지
          </p>

          <Link
            ref={firstLinkRef}
            href="/settings/extension"
            onClick={dismiss}
            className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors group"
          >
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold flex items-center justify-center">
              1
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                크롬 확장 설치 + 토큰 발급
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                amazon · taobao 영수증 자동 수집과 결제 시 배대지 자동 채움.
              </p>
            </div>
            <Arrow />
          </Link>

          <Link
            href="/settings/forwarder-addresses"
            onClick={dismiss}
            className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors group"
          >
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-sky-100 text-sky-700 text-sm font-bold flex items-center justify-center">
              2
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                본인 배대지 주소 등록
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                자주 쓰는 배대지의 회원번호 + 주소 입력 → 결제 시 자동 채움.
              </p>
            </div>
            <Arrow />
          </Link>

          <Link
            href="/orders/new"
            onClick={dismiss}
            className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors group"
          >
            <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold flex items-center justify-center">
              3
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                첫 마켓 주문 등록
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                쿠팡·스마트스토어 등 받은 주문을 입력 → 배대지 양식 변환 가능.
              </p>
            </div>
            <Arrow />
          </Link>
        </div>

        {/* 풋터 */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500">
            대시보드 체크리스트에서 언제든 다시 확인할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-semibold text-slate-700 hover:text-indigo-700 bg-white border border-slate-300 hover:border-indigo-300 rounded-md px-3 py-1.5 transition-colors"
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  )
}

function Arrow() {
  return (
    <svg
      className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 flex-shrink-0 mt-1.5 transition-colors"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}
