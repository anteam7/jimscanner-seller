// 공용 표시 포맷 헬퍼 (#idle-5 중복 유틸 통합)
// 여러 페이지·컴포넌트에 byte-identical 하게 복붙돼 있던 formatter 를 한 곳으로 통합.
// 동작·출력은 기존 구현과 동일 (ko-KR locale). 서버·클라 양쪽에서 사용 가능한 순수 함수.

/** 원화 금액. null/빈값/비유한 → '—'. 예: 12,345원 */
export function formatKRW(value: number | string | null): string {
  if (value == null || value === '') return '—'
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('ko-KR').format(n) + '원'
}

/** 외화 금액 + 통화 코드. 통화 없거나 비유한 → '—'. 예: 12.50 USD */
export function formatForeign(value: number | string | null, currency: string | null): string {
  if (value == null || value === '' || !currency) return '—'
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 2 }).format(n)} ${currency}`
}

/** 날짜 (YYYY. MM. DD). 파싱 불가 → 원본 문자열 그대로. */
export function formatDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

/** 날짜+시각. null → '—', 파싱 불가 → 원본 문자열. */
export function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

/** 무게 (kg). null/빈값/0 이하/비유한 → '—'. 예: 1.25 kg */
export function formatWeight(value: number | string | null): string {
  if (value == null || value === '') return '—'
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return '—'
  return `${new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 3 }).format(n)} kg`
}

/** ISO 문자열 → "YY.MM.DD HH:MM" (로컬 시간, 2자리 연도). 알림·문의 목록 등 컴팩트 표기용. */
export function formatDateTimeShort(value: string): string {
  const d = new Date(value)
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  const hh = String(d.getHours()).padStart(2, "0")
  const mi = String(d.getMinutes()).padStart(2, "0")
  return `${yy}.${mm}.${dd} ${hh}:${mi}`
}
