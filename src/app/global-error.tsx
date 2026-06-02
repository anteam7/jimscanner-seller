'use client'

import { useEffect } from 'react'
import './globals.css'

/**
 * 전역 에러 바운더리 — 루트 레이아웃 자체의 렌더 실패나, 자체 error.tsx 가 없는
 * 공개 세그먼트(login·signup·auth·suspended·pricing 등)의 throw 를 잡는 최후의 그물.
 * global-error 는 루트 레이아웃을 대체하므로 자체 <html>/<body> 를 렌더한다.
 * 정상 경로에선 렌더되지 않음 (순수 additive). 크래시 화면이 다시 크래시하지 않도록
 * next/image·외부 컴포넌트 없이 순수 엘리먼트만 사용한다.
 */
const PRETENDARD_CSS_URL =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // 개발 중 원인 파악용 — 프로덕션에선 digest 만 사용자에게 노출
    console.error('[global-error]', error)
  }, [error])

  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href={PRETENDARD_CSS_URL} />
      </head>
      <body className="antialiased">
        <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900">
          <div
            role="alert"
            className="w-full max-w-md rounded-xl border border-slate-200 border-l-[3px] border-l-rose-500 bg-white p-8 text-center shadow-sm"
          >
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
              <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.007M10.34 3.94 1.95 18.06A1.5 1.5 0 0 0 3.26 20.25h17.48a1.5 1.5 0 0 0 1.31-2.19L13.66 3.94a1.5 1.5 0 0 0-2.62 0Z" />
              </svg>
            </div>

            <h1 className="text-lg font-bold tracking-tight text-slate-900">문제가 발생했습니다</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
              페이지를 불러오는 중 예기치 못한 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
              문제가 계속되면 잠시 뒤 다시 접속해 주시면 빠르게 정상화됩니다.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => reset()}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:from-indigo-500 hover:to-indigo-600 hover:shadow-md"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                다시 시도
              </button>
              {/* 루트 크래시 복구는 전체 새로고침이 안전하므로 의도적으로 plain anchor (full reload) */}
              <a
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100"
              >
                대시보드로
              </a>
            </div>

            {error.digest ? (
              <p className="mt-6 text-xs text-slate-400">
                오류 코드: <span className="font-mono">{error.digest}</span>
              </p>
            ) : null}
          </div>
        </div>
      </body>
    </html>
  )
}
