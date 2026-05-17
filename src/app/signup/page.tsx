import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: '사업자 회원가입',
  description: '직구 구매대행 사업자를 위한 주문 통합·배대지 양식 자동화·의뢰자 관리 서비스에 가입하세요.',
  robots: { index: false },
}

const BENEFITS = [
  {
    icon: '📦',
    title: '주문 통합 관리',
    desc: '카카오·구글폼·엑셀 등 다채널 주문을 하나의 화면에서 처리하세요.',
  },
  {
    icon: '🔄',
    title: '배대지 양식 자동 변환',
    desc: '33개 배대지 신청 양식을 원클릭으로 생성·다운로드합니다.',
  },
  {
    icon: '👥',
    title: '의뢰자 CRM',
    desc: '의뢰자별 주문 이력과 LTV를 한눈에 파악하세요.',
  },
]

export default function SellerSignupPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <Link href="/signup" className="text-lg font-bold text-indigo-600 tracking-tight">
          짐스캐너 B2B
        </Link>
        <Link
          href="/login"
          className="text-sm text-slate-400 hover:text-slate-900 transition-colors"
        >
          이미 계정이 있으신가요? <span className="text-indigo-600 font-medium">로그인</span>
        </Link>
      </header>

      {/* 히어로 */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <span className="inline-block mb-4 rounded-full bg-indigo-50 px-4 py-1 text-xs font-semibold text-indigo-700 uppercase tracking-widest">
          직구 사업자 전용 도구
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4 max-w-2xl">
          구매대행, 더 빠르게
          <br />
          <span className="text-indigo-600">스마트하게</span> 운영하세요
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mb-10">
          주문 통합부터 배대지 양식 자동화까지. 월 100건 이상 처리하는 사업자라면
          시간 낭비를 줄일 수 있습니다.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-16">
          <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-8">
            <Link href="/signup/step-1">지금 무료로 시작하기</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <Link href="/login">기존 계정으로 로그인</Link>
          </Button>
        </div>

        {/* 혜택 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl w-full">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="rounded-xl border border-slate-200 bg-slate-100 p-6 text-left"
            >
              <div className="text-3xl mb-3">{b.icon}</div>
              <h3 className="font-semibold text-slate-900 mb-1">{b.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* 가입 단계 안내 */}
        <div className="mt-14 max-w-xl w-full">
          <p className="text-xs text-slate-400 mb-4 uppercase tracking-wider">가입 절차 (약 5분)</p>
          <ol className="flex flex-col gap-2 text-sm text-slate-400">
            {[
              '이메일·비밀번호 설정',
              '약관 동의',
              '이메일 인증',
              '사업자 정보 입력',
              '사업자등록번호 진위 확인 (자동)',
              '사업자등록증 사진 업로드 (선택)',
            ].map((step, i) => (
              <li key={step} className="flex items-center gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-900 text-indigo-700 text-xs flex items-center justify-center font-bold">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-200">
        © 2026 짐스캐너. 사업자 서비스는 현재 베타 운영 중입니다.
      </footer>
    </div>
  )
}
