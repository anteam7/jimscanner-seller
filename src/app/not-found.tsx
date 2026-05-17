import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없습니다',
  robots: { index: false },
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 relative overflow-hidden">
      {/* 배경 — signup 과 동일 톤 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(99,102,241,0.18),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background-image:radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
      />

      {/* 헤더 */}
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <Link href="/dashboard" className="inline-flex items-center gap-2" aria-label="짐스캐너 홈">
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
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-10 text-center max-w-2xl mx-auto w-full">
        {/* 큰 404 */}
        <p className="text-[120px] md:text-[160px] font-extrabold leading-none tracking-tight bg-gradient-to-br from-indigo-500 via-indigo-600 to-sky-600 bg-clip-text text-transparent select-none">
          404
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mt-2 mb-3">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="text-sm text-slate-600 max-w-md mb-8 leading-relaxed">
          요청하신 페이지의 주소가 잘못되었거나, 페이지가 이동·삭제되었을 수 있습니다.
          아래 링크에서 자주 찾는 페이지로 이동할 수 있습니다.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-md bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all"
          >
            대시보드로 이동
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <Link
            href="/orders"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-400 text-sm font-semibold transition-colors"
          >
            주문 목록 →
          </Link>
        </div>

        {/* 주요 페이지 바로가기 */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2">
          <QuickLink href="/orders/new" label="새 주문" />
          <QuickLink href="/products" label="상품 SKU" />
          <QuickLink href="/templates" label="배대지 양식" />
          <QuickLink href="/analytics" label="매출·마진" />
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-slate-500 border-t border-slate-200 bg-white">
        © 2026 짐스캐너 SELLER · seller.jimscanner.co.kr
      </footer>
    </div>
  )
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-700 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors shadow-sm hover:shadow-md text-center"
    >
      {label}
    </Link>
  )
}
