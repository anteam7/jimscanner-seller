/**
 * 표준 form 에러 표시. v2.1 디자인 토큰 — rose-700, 11px.
 * inline 필드 에러용: <FormError id="email-error">메시지</FormError>
 *
 * 상자형(배경 박스) 에러는 FormAlert 사용.
 */
export function FormError({
  id,
  children,
  className = '',
}: {
  id?: string
  children: React.ReactNode
  className?: string
}) {
  if (!children) return null
  return (
    <p
      id={id}
      role="alert"
      className={`mt-1 text-[11px] text-rose-700 ${className}`}
    >
      {children}
    </p>
  )
}

/**
 * 상자형 form 에러 (제출 실패 등 큰 메시지).
 */
export function FormAlert({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  if (!children) return null
  return (
    <div
      role="alert"
      className={`rounded-lg bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-700 ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * input/select/textarea 에 적용할 표준 에러 상태 className.
 * 사용 예: className={`base-input ${errorRingClass(hasError)}`}
 */
export function errorRingClass(hasError: boolean): string {
  return hasError
    ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500'
    : ''
}
