'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/auth/client'
import AnnouncementBanner from '@/components/b2b/AnnouncementBanner'

export type SellerAccount = {
  id: string
  email: string
  business_name: string | null
  verification_level: number
  verification_status: string
  suspended_at: string | null
}

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: '대시보드',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
      </svg>
    ),
    available: true,
  },
  {
    href: '/orders',
    label: '주문 관리',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
      </svg>
    ),
    available: true,
  },
  {
    href: '/clients',
    label: '의뢰자 관리',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
    available: false,
  },
  {
    href: '/forwarders',
    label: '배대지 양식',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m-6 3.75 3 3m0 0 3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75" />
      </svg>
    ),
    available: false,
  },
  {
    href: '/pricing',
    label: '요금제',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
      </svg>
    ),
    available: true,
  },
  {
    href: '/settings',
    label: '설정',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </svg>
    ),
    available: true,
  },
]

function VerificationBadge({ level, variant = 'light' }: { level: number; variant?: 'light' | 'dark' }) {
  const capped = Math.min(level, 3)
  const lightMap: Record<number, { color: string; label: string }> = {
    0: { color: 'bg-slate-100 text-slate-600 border-slate-200', label: 'L0 미인증' },
    1: { color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'L1 이메일' },
    2: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'L2 사업자' },
    3: { color: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'L3 완전인증' },
  }
  const darkMap: Record<number, { color: string; label: string }> = {
    0: { color: 'bg-slate-700/60 text-slate-300 border-slate-600', label: 'L0 미인증' },
    1: { color: 'bg-blue-900/40 text-blue-200 border-blue-800/50', label: 'L1 이메일' },
    2: { color: 'bg-emerald-900/40 text-emerald-200 border-emerald-800/50', label: 'L2 사업자' },
    3: { color: 'bg-indigo-900/40 text-indigo-200 border-indigo-800/50', label: 'L3 완전인증' },
  }
  const { color, label } = (variant === 'dark' ? darkMap : lightMap)[capped]
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${color}`}>
      {label}
    </span>
  )
}

export default function SellerShell({
  children,
  account,
  userEmail,
  planCode = 'free',
}: {
  children: React.ReactNode
  account: SellerAccount
  userEmail: string
  planCode?: string
}) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="h-screen flex bg-slate-50 text-slate-900 overflow-hidden">
      {/* 사이드바 — 다크 톤 */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col bg-slate-800 text-slate-100">
        {/* 로고 — B2C 짐스캐너 로고 + SELLER 표기 */}
        <div className="px-5 py-4 border-b border-slate-700">
          <Link
            href="/dashboard"
            aria-label="짐스캐너 SELLER 대시보드"
            className="flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded"
          >
            <Image
              src="/jimscanner-logo.png"
              alt="짐스캐너"
              width={345}
              height={80}
              priority
              className="h-7 w-auto brightness-0 invert opacity-95 group-hover:opacity-100 transition-opacity"
            />
            <span className="text-[11px] font-semibold tracking-widest text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 rounded px-1.5 py-0.5">
              SELLER
            </span>
          </Link>
        </div>

        {/* 내비게이션 */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="주요 메뉴">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/')

            if (!item.available) {
              return (
                <div
                  key={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-500 cursor-not-allowed select-none"
                  aria-disabled="true"
                >
                  {item.icon}
                  <span className="text-sm">{item.label}</span>
                  <span className="ml-auto text-[10px] text-slate-500 bg-slate-700/60 rounded px-1.5 py-0.5">준비 중</span>
                </div>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-800
                  ${isActive
                    ? 'bg-indigo-500/20 text-indigo-200 font-medium'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* free 플랜 업그레이드 CTA */}
        {planCode === 'free' && (
          <div className="px-3 pb-3">
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 14 14" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 2v10M2 7h10" />
              </svg>
              업그레이드
            </Link>
          </div>
        )}

        {/* 유저 정보 + 로그아웃 */}
        <div className="px-3 py-3 border-t border-slate-700 space-y-1">
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-white truncate">
              {account.business_name ?? userEmail}
            </p>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">{userEmail}</p>
            <div className="mt-1.5">
              <VerificationBadge level={account.verification_level} variant="dark" />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-400 hover:bg-slate-700 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
            </svg>
            로그아웃
          </button>
        </div>
      </aside>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 상단 헤더 — 라이트 */}
        <header className="flex items-center justify-between px-6 h-14 bg-white border-b border-slate-200 flex-shrink-0">
          <div />
          <div className="flex items-center gap-3">
            <VerificationBadge level={account.verification_level} />
            <div
              aria-hidden="true"
              className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white"
            >
              {userEmail.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* 플랫폼 공지 배너 */}
        <AnnouncementBanner />

        {/* 페이지 콘텐츠 */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {children}
        </div>
      </div>
    </div>
  )
}
