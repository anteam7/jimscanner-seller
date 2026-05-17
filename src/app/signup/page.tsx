import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '회원가입',
  description:
    '국내 마켓 셀러를 위한 해외 매입 + 33 배대지 양식 자동화 도구. 주문 1건 처리 5분 → 30초.',
  robots: { index: false },
}

export default function SellerSignupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 relative overflow-hidden">
      {/* 배경 — 그라데이션 + 도트 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_60%_at_50%_-10%,rgba(99,102,241,0.18),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.4] [background-image:radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]"
      />

      {/* 헤더 */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
        <Link href="/signup" className="inline-flex items-center gap-2" aria-label="짐스캐너 홈">
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
        <div className="flex items-center gap-3">
          <Link
            href="/pricing"
            className="hidden sm:inline text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            요금제
          </Link>
          <Link
            href="/login"
            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span className="hidden sm:inline">이미 계정이 있으신가요? </span>
            <span className="text-indigo-600 font-medium">로그인 →</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 pt-8 pb-20 max-w-6xl mx-auto w-full">
        {/* 히어로 */}
        <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-12 items-center w-full mb-20">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 mb-5 rounded-full bg-white border border-indigo-200 px-3 py-1 text-[11px] font-semibold text-indigo-700 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              쿠팡·스마트스토어·옥션 마켓 셀러용
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-[1.12] mb-5 tracking-tight">
              마켓 주문 1건 처리,
              <br />
              <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-600 bg-clip-text text-transparent">
                5분 → 30초
              </span>
            </h1>
            <p className="text-slate-600 text-base md:text-lg max-w-xl lg:max-w-none mb-8 leading-relaxed">
              쿠팡·스마트스토어에서 주문 받고 미국 아마존·라쿠텐에서 매입해서{' '}
              <span className="text-slate-900 font-semibold">33개 배대지</span>로 한국
              구매자에게 보내는 셀러를 위한 도구. 매번 다시 입력하던 양식 변환을 자동화합니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start mb-3">
              <Link
                href="/signup/step-1"
                className="inline-flex items-center justify-center gap-1.5 px-6 py-3 rounded-md bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
              >
                지금 무료로 시작하기
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-slate-400 text-sm font-semibold transition-colors"
              >
                기존 계정으로 로그인
              </Link>
            </div>
            <p className="text-[11px] text-slate-500">
              신용카드 불필요 · 무료 플랜으로 시작 · 약 5분 가입
            </p>
          </div>

          {/* 우측 — 미니 대시보드 mockup */}
          <div className="relative">
            <DashboardMockup />
          </div>
        </section>

        {/* 통계 바 — 사회 증거 / scale */}
        <section className="w-full mb-20">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
            <StatBlock label="배대지 양식" value="33" suffix="개" />
            <StatBlock label="국내 마켓" value="13" suffix="개" />
            <StatBlock label="해외 매입처" value="24" suffix="개" />
            <StatBlock label="통화" value="7" suffix="종" />
          </div>
        </section>

        {/* 워크플로우 */}
        <section className="w-full mb-20">
          <div className="text-center mb-8">
            <p className="text-[11px] font-bold text-indigo-700 tracking-widest uppercase mb-2">
              WORKFLOW
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              셀러 일상의 3단계, 모두 자동화
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-3 md:gap-2 items-stretch">
            <WorkflowStep
              num="1"
              color="emerald"
              title="마켓에서 주문 접수"
              subtitle="쿠팡·스마트스토어·옥션·지마켓·자사몰 등 13개 마켓의 주문번호·구매자 정보를 한 화면에 등록"
            />
            <ArrowSpacer />
            <WorkflowStep
              num="2"
              color="sky"
              title="해외 매입"
              subtitle="미국 아마존·라쿠텐·타오바오·이베이 등 24개 해외 사이트의 매입 기록 · SKU 한번 등록 후 자동 채움"
            />
            <ArrowSpacer />
            <WorkflowStep
              num="3"
              color="indigo"
              title="33 배대지 → 구매자"
              subtitle="배대지 양식 자동 변환 + 같은 수취인 합배송 묶기 + 운송장 추적까지"
            />
          </div>
        </section>

        {/* 핵심 기능 6개 */}
        <section className="w-full mb-20">
          <div className="text-center mb-8">
            <p className="text-[11px] font-bold text-indigo-700 tracking-widest uppercase mb-2">
              FEATURES
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              매일 N건 처리하는 셀러를 위한 핵심 기능
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              accent="indigo"
              title="33개 배대지 양식 자동"
              desc="짐패스·몰테일·아이포터 등 양식별 다른 컬럼을 주문 데이터로 자동 채움. 우리 양식이 없어도 직접 업로드해 매핑 가능."
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664" />
                </svg>
              }
            />
            <FeatureCard
              accent="emerald"
              title="반복 SKU 자동 채움"
              desc="한 번 등록한 상품의 매입처·단가·배대지·중량을 다음 주문부터 자동. 같은 상품 매번 다시 입력 X."
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              }
            />
            <FeatureCard
              accent="sky"
              title="실시간 마진 계산"
              desc="해외 단가 → 한국수출입은행 환율로 KRW 자동 환산. 판매가에서 빼서 SKU 별 마진을 한눈에."
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              }
            />
            <FeatureCard
              accent="indigo"
              title="합배송 자동 묶기"
              desc="같은 수취인이 N개 주문한 경우 1 파일에 모아서 다운로드. 배대지 한 번에 제출, 운송비 절약."
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              }
            />
            <FeatureCard
              accent="emerald"
              title="일괄 입력 (엑셀 paste)"
              desc="엑셀에서 그대로 복사 → 27 컬럼 그리드에 붙여넣기. 한글 라벨도 자동 인식. 매일 N건을 분 단위로."
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              }
            />
            <FeatureCard
              accent="sky"
              title="사업자 자동 인증"
              desc="국세청 사업자등록 진위확인 API 연동. 사업자등록번호만 입력하면 1초 검증 → 신뢰 단계 업그레이드."
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              }
            />
          </div>
        </section>

        {/* 가입 단계 + 최종 CTA */}
        <section className="w-full grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-6">
          {/* 가입 절차 */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">가입 절차</h2>
              <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-0.5">
                약 5분
              </span>
            </div>
            <ol className="space-y-2 text-sm text-slate-700">
              {[
                '이메일·비밀번호 설정',
                '약관 동의',
                '이메일 인증',
                '사업자 정보 입력',
                '사업자등록 진위 확인 (자동)',
                '사업자등록증 업로드 (선택)',
              ].map((step, i) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[11px] text-slate-500">
              사업자등록 없이도 가입 가능 · 추후 인증으로 모든 기능 활성
            </p>
          </div>

          {/* 마지막 CTA */}
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-sky-50 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-2">
                지금 시작하면 무료 플랜
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed mb-4">
                월 N건까지 무료. 신용카드 불필요. 가입 후 바로 첫 주문 등록 →
                배대지 양식 다운로드를 30초 안에 체험할 수 있습니다.
              </p>
              <ul className="text-xs text-slate-600 space-y-1 mb-5">
                <li className="flex items-center gap-2">
                  <CheckIcon /> 짐패스 v1 공식 양식 즉시 사용
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon /> 내 배대지 양식 직접 업로드 가능
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon /> SKU 마스터 · 마진 분석 포함
                </li>
              </ul>
            </div>
            <Link
              href="/signup/step-1"
              className="inline-flex items-center justify-center gap-1.5 w-full px-6 py-3 rounded-md bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-sm font-semibold shadow-sm hover:shadow-md transition-all"
            >
              무료로 시작하기
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="w-full mt-16">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-5 text-center">
            자주 묻는 질문
          </h2>
          <div className="space-y-3">
            <FaqItem
              q="이미 사용 중인 배대지 양식이 짐스캐너에 없으면 어떻게 하나요?"
              a="셀러가 직접 양식 xlsx (또는 xls) 를 업로드하면 첫 행 헤더를 자동 추출해서 매핑 항목을 생성합니다. 매핑 에디터에서 컬럼별로 어떤 주문 필드를 채울지 지정만 하면 다음 변환부터 자동 채워집니다."
            />
            <FaqItem
              q="사업자등록 없이도 가입할 수 있나요?"
              a="네. 이메일·약관 동의만으로 가입 가능합니다. 사업자등록번호는 추후 입력해서 신뢰 단계 (L2 사업자) 로 업그레이드할 수 있고, 그때 일부 기능 (대량 주문, 추가 기능) 이 활성화됩니다."
            />
            <FaqItem
              q="환율은 어떻게 적용되나요?"
              a="한국수출입은행 매매기준율을 매일 자동 fetch 합니다. 주문 등록 시 해외 단가 (USD/JPY 등) 를 입력하면 즉시 KRW 환산 결과와 예상 마진을 보여드립니다. 환율 API 장애 시 직전 캐시값으로 폴백."
            />
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <footer className="text-center py-6 text-xs text-slate-500 border-t border-slate-200 bg-white">
        © 2026 짐스캐너 · seller.jimscanner.co.kr · 사업자 서비스는 베타 운영 중입니다.
      </footer>
    </div>
  )
}

/* ============================================================
 * 서브 컴포넌트
 * ============================================================ */

function StatBlock({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="text-center px-3 py-5">
      <p className="text-3xl font-bold tabular-nums tracking-tight bg-gradient-to-r from-indigo-700 to-sky-600 bg-clip-text text-transparent">
        {value}
        {suffix && <span className="text-xl text-slate-500 ml-0.5 font-semibold">{suffix}</span>}
      </p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  )
}

function WorkflowStep({
  num,
  color,
  title,
  subtitle,
}: {
  num: string
  color: 'emerald' | 'sky' | 'indigo'
  title: string
  subtitle: string
}) {
  const map = {
    emerald: { borderL: 'border-l-emerald-500', grad: 'from-emerald-50', txt: 'text-emerald-700' },
    sky: { borderL: 'border-l-sky-500', grad: 'from-sky-50', txt: 'text-sky-700' },
    indigo: { borderL: 'border-l-indigo-500', grad: 'from-indigo-50', txt: 'text-indigo-700' },
  }
  const c = map[color]
  return (
    <div
      className={`rounded-xl border border-slate-200 border-l-[3px] ${c.borderL} bg-gradient-to-br ${c.grad} to-white p-5 text-left shadow-sm hover:shadow-md transition-shadow`}
    >
      <p className={`text-[10px] font-bold ${c.txt} tracking-wider uppercase mb-1.5`}>
        STEP {num}
      </p>
      <p className="text-sm font-semibold text-slate-900 mb-1">{title}</p>
      <p className="text-[11px] text-slate-500 leading-relaxed">{subtitle}</p>
    </div>
  )
}

function ArrowSpacer() {
  return (
    <div
      className="hidden md:flex items-center justify-center text-slate-300"
      aria-hidden="true"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
      </svg>
    </div>
  )
}

function FeatureCard({
  accent,
  icon,
  title,
  desc,
}: {
  accent: 'indigo' | 'emerald' | 'sky'
  icon: React.ReactNode
  title: string
  desc: string
}) {
  const map = {
    indigo: { borderL: 'border-l-indigo-500', iconBg: 'bg-indigo-50', iconC: 'text-indigo-700' },
    emerald: { borderL: 'border-l-emerald-500', iconBg: 'bg-emerald-50', iconC: 'text-emerald-700' },
    sky: { borderL: 'border-l-sky-500', iconBg: 'bg-sky-50', iconC: 'text-sky-700' },
  }
  const c = map[accent]
  return (
    <div
      className={`rounded-xl border border-slate-200 border-l-[3px] ${c.borderL} bg-white p-5 text-left shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${c.iconBg} ${c.iconC} mb-3`}>
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-slate-900 mb-1.5">{title}</h3>
      <p className="text-[13px] text-slate-600 leading-relaxed">{desc}</p>
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-5 py-4">
        <span className="text-sm font-semibold text-slate-900">{q}</span>
        <svg
          className="w-4 h-4 text-slate-400 flex-shrink-0 transition-transform group-open:rotate-180"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </summary>
      <p className="px-5 pb-4 -mt-1 text-[13px] text-slate-600 leading-relaxed">{a}</p>
    </details>
  )
}

function CheckIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

/** 히어로 우측 미니 대시보드 mockup (정적 SVG/CSS) */
function DashboardMockup() {
  return (
    <div className="relative">
      {/* 광원 */}
      <div
        aria-hidden="true"
        className="absolute -inset-4 bg-gradient-to-tr from-indigo-200/40 via-sky-200/30 to-emerald-200/40 blur-3xl -z-10"
      />
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        {/* 모의 헤더 (browser chrome) */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 bg-slate-50">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 text-[10px] text-slate-400 font-mono">seller.jimscanner.co.kr/dashboard</span>
        </div>
        <div className="p-4 space-y-3 bg-white">
          {/* H1 */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">안녕하세요 👋</p>
            <span className="text-[10px] text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">오늘</span>
          </div>
          {/* 통계 카드 3개 */}
          <div className="grid grid-cols-3 gap-2">
            <MockStatCard accent="indigo" label="이번달 주문" value="142" />
            <MockStatCard accent="emerald" label="판매 합계" value="₩8.4M" />
            <MockStatCard accent="sky" label="활성 SKU" value="38" />
          </div>
          {/* 빠른 작업 */}
          <p className="text-[10px] font-semibold text-slate-500 pt-1">빠른 작업</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
              <p className="text-[11px] font-semibold text-slate-900">+ 새 주문 입력</p>
              <p className="text-[10px] text-slate-500 mt-0.5">수동 입력 · SKU 자동</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5">
              <p className="text-[11px] font-semibold text-slate-900">배대지 양식 변환</p>
              <p className="text-[10px] text-slate-500 mt-0.5">짐패스 · 몰테일 등</p>
            </div>
          </div>
          {/* 주문 row 1개 */}
          <p className="text-[10px] font-semibold text-slate-500 pt-1">최근 주문</p>
          <div className="rounded-md border border-slate-200 px-2.5 py-2 flex items-center gap-2 text-[10px]">
            <span className="inline-flex items-center rounded bg-slate-100 px-1 py-0 text-[9px] font-medium text-slate-700">
              쿠팡
            </span>
            <span className="font-mono text-slate-700">COUPANG-26051700123</span>
            <span className="text-slate-500">김구매</span>
            <span className="ml-auto text-emerald-700 font-semibold tabular-nums">₩89,000</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MockStatCard({
  accent,
  label,
  value,
}: {
  accent: 'indigo' | 'emerald' | 'sky'
  label: string
  value: string
}) {
  const map = {
    indigo: 'from-indigo-50 to-white border-l-indigo-500 text-indigo-700',
    emerald: 'from-emerald-50 to-white border-l-emerald-500 text-emerald-700',
    sky: 'from-sky-50 to-white border-l-sky-500 text-sky-700',
  }
  const [g1, g2, borderL, txt] = map[accent].split(' ')
  return (
    <div className={`rounded-md border border-slate-200 border-l-[3px] ${borderL} bg-gradient-to-br ${g1} ${g2} p-2`}>
      <p className="text-[9px] text-slate-500">{label}</p>
      <p className={`text-base font-bold tabular-nums ${txt}`}>{value}</p>
    </div>
  )
}
