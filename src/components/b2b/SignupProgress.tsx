export const SIGNUP_STEPS = [
  '이메일·비밀번호',
  '약관 동의',
  '이메일 인증',
  '사업자 정보',
  '진위 확인',
  '서류 업로드',
]

export function SignupProgress({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="가입 진행 단계" className="flex items-center gap-1 mb-8 flex-wrap justify-center">
      {SIGNUP_STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-1">
          <div
            aria-current={i === currentStep ? 'step' : undefined}
            aria-label={i < currentStep ? `${i + 1}단계 완료` : i === currentStep ? `${i + 1}단계 현재 진행 중` : `${i + 1}단계`}
            className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors
              ${
                i === currentStep
                  ? 'bg-indigo-600 text-white'
                  : i < currentStep
                  ? 'bg-indigo-900 text-indigo-400'
                  : 'bg-slate-800 text-slate-500'
              }`}
          >
            {i < currentStep ? (
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M2 6l3 3 5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <span aria-hidden="true">{i + 1}</span>
            )}
          </div>
          <span
            className={`text-xs hidden sm:inline ${
              i === currentStep ? 'text-white' : 'text-slate-600'
            }`}
          >
            {label}
          </span>
          {i < SIGNUP_STEPS.length - 1 && (
            <span className="text-slate-700 mx-0.5" aria-hidden="true">
              ›
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}
