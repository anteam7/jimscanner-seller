import Image from 'next/image'
import Link from 'next/link'

type Props = {
  /** 헤더 우측 링크 — null 이면 표시 안 함 */
  topRight?: { href: string; label: string; emphasis?: string } | null
  children: React.ReactNode
  /** 폼 카드 최대 너비 — 기본 max-w-md */
  maxWidth?: 'md' | 'lg'
}

/**
 * /login, /signup, /auth/* 페이지 공통 외곽.
 * 배경 (indigo radial + dot pattern) + 헤더 (로고 PNG + SELLER pill + topRight) + 푸터.
 */
export default function AuthShell({ topRight, children, maxWidth = 'md' }: Props) {
  const maxW = maxWidth === 'lg' ? 'max-w-lg' : 'max-w-md'
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 relative overflow-hidden">
      {/* 배경 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(99,102,241,0.18),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background-image:radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
      />

      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <Link href="/login" className="inline-flex items-center gap-2" aria-label="짐스캐너 홈">
          <Image
            src="/jimscanner-logo.png"
            alt="짐스캐너"
            width={120}
            height={28}
            priority
            className="h-7 w-auto"
          />
          <span className="text-[10px] font-bold tracking-wider text-slate-500 bg-white border border-slate-200 rounded px-1.5 py-0.5">
            SELLER
          </span>
        </Link>
        {topRight && (
          <Link
            href={topRight.href}
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            {topRight.label}
            {topRight.emphasis && (
              <span className="text-indigo-600 font-medium ml-1">{topRight.emphasis}</span>
            )}
          </Link>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className={`w-full ${maxW}`}>{children}</div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-500 border-t border-slate-200 bg-white">
        © 2026 짐스캐너 SELLER · seller.jimscanner.co.kr
      </footer>
    </div>
  )
}
