import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '설정 | 짐스캐너 B2B',
  robots: { index: false },
}

type SettingCard = {
  title: string
  description: string
  href: string
  available: boolean
  badge?: string
  icon: React.ReactNode
}

const SETTING_SECTIONS: { heading: string; cards: SettingCard[] }[] = [
  {
    heading: '계정 보안',
    cards: [
      {
        title: '계정 정보',
        description: '연락처·주소 수정, 이메일 변경, 비밀번호 직접 변경',
        href: '/settings/account',
        available: true,
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        ),
      },
      {
        title: '보안 설정',
        description: '2단계 인증(TOTP) 설정 및 활성 세션 관리',
        href: '/settings/security',
        available: true,
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
          </svg>
        ),
      },
      {
        title: 'API 키 관리',
        description: '외부 연동을 위한 API 키 발급·폐기 (L4 인증 계정 전용)',
        href: '/settings/api-keys',
        available: false,
        badge: '준비 중',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" />
          </svg>
        ),
      },
    ],
  },
  {
    heading: '팀 관리',
    cards: [
      {
        title: '팀원 초대',
        description: '운영·청구·열람 등 역할별 팀원 초대 및 권한 설정',
        href: '/settings/team',
        available: false,
        badge: '준비 중',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
          </svg>
        ),
      },
    ],
  },
  {
    heading: '연동·자동화',
    cards: [
      {
        title: '웹훅 수신',
        description: '카카오폼·구글폼 등 외부 폼에서 주문을 자동으로 수신',
        href: '/settings/webhooks',
        available: false,
        badge: '준비 중',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
          </svg>
        ),
      },
      {
        title: '구글 시트 연동',
        description: '구글 시트에서 주문을 10분 주기로 자동 가져오기',
        href: '/settings/integrations/google-sheets',
        available: false,
        badge: '준비 중',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m2.25-4.5h7.5" />
          </svg>
        ),
      },
      {
        title: '카카오 알림톡',
        description: '주문 상태 변경 시 의뢰자에게 카카오 알림톡 자동 발송',
        href: '/settings/integrations/kakao',
        available: false,
        badge: '준비 중',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
          </svg>
        ),
      },
    ],
  },
  {
    heading: '법규·컴플라이언스',
    cards: [
      {
        title: '청약철회 고지 설정',
        description: '전자상거래법 §17 청약철회 자동 고지 ON/OFF 및 문구 설정',
        href: '/settings/compliance',
        available: true,
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
          </svg>
        ),
      },
    ],
  },
  {
    heading: '의뢰자 서비스',
    cards: [
      {
        title: '주문 접수 폼',
        description: '의뢰자가 직접 주문을 접수하는 공개 페이지 설정',
        href: '/settings/intake-page',
        available: false,
        badge: '준비 중',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
          </svg>
        ),
      },
      {
        title: '주문 조회 포털',
        description: '의뢰자가 주문번호·연락처로 배송 상태를 직접 조회하는 공개 페이지',
        href: '/settings/tracking',
        available: false,
        badge: '준비 중',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        ),
      },
    ],
  },
]

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white">설정</h1>
        <p className="text-sm text-slate-400 mt-0.5">계정·보안·연동 설정을 관리합니다.</p>
      </div>

      {SETTING_SECTIONS.map((section) => (
        <section key={section.heading}>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {section.heading}
          </h2>
          <div className="space-y-2">
            {section.cards.map((card) =>
              card.available ? (
                <Link
                  key={card.href}
                  href={card.href}
                  className="flex items-center gap-4 px-4 py-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 hover:border-slate-700 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-900/40 border border-indigo-800/40 flex items-center justify-center flex-shrink-0 text-indigo-400 group-hover:bg-indigo-900/60 transition-colors">
                    {card.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{card.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{card.description}</p>
                  </div>
                  <svg
                    className="w-4 h-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ) : (
                <div
                  key={card.href}
                  className="flex items-center gap-4 px-4 py-4 rounded-xl border border-slate-800/60 bg-slate-900/20 cursor-not-allowed"
                  aria-disabled="true"
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-800/40 border border-slate-700/30 flex items-center justify-center flex-shrink-0 text-slate-600">
                    {card.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-500">{card.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5 truncate">{card.description}</p>
                  </div>
                  {card.badge && (
                    <span className="flex-shrink-0 text-xs text-slate-600 bg-slate-800/60 rounded-full px-2.5 py-0.5 border border-slate-700/40">
                      {card.badge}
                    </span>
                  )}
                </div>
              )
            )}
          </div>
        </section>
      ))}
    </div>
  )
}
