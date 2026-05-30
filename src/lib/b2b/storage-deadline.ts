// 배대지 보관기간 deadline 계산 helper
// 배대지(해외 배송대행지)에 입고된 주문(status=forwarder_submitted)은 한국으로
// 출고(in_transit)되기 전까지 창고에 머문다. 무료 보관일을 넘기면 보관비가 누적되므로
// forwarder_submitted_at 기준 경과일을 계산해 임박/초과를 표시한다.
//
// 기준 신호: b2b_orders.forwarder_submitted_at (배대지 접수 시각, 실 컬럼) — DB 변경 없음.
// status_history 는 현재 미기록이라 신뢰 불가하여 forwarder_submitted_at 을 사용.

/** 배대지별 무료 보관일은 상이하나(보통 7~30일), 가장 보수적인 기본값으로 7일 사용. */
export const DEFAULT_FREE_STORAGE_DAYS = 7

/** 무료 기간 만료 N일 이내면 '임박'(amber) 으로 경고. */
export const STORAGE_WARN_WITHIN_DAYS = 2

/** 셀러가 무료 보관일을 본인 배대지 정책에 맞게 조정 — 쿠키에 저장 (DB 변경 없음). */
export const FREE_STORAGE_DAYS_COOKIE = 'b2b_free_storage_days'

/** 쿠키/입력값을 안전한 무료 보관일로 파싱 (1~60일, 범위 밖이면 기본값). */
export function parseFreeStorageDays(raw: string | null | undefined): number {
  const n = Number(raw)
  if (Number.isFinite(n) && n >= 1 && n <= 60) return Math.floor(n)
  return DEFAULT_FREE_STORAGE_DAYS
}

export type StorageLevel = 'ok' | 'warn' | 'over'

export type StorageStatus = {
  /** 배대지 접수 후 경과한 일수 (floor). */
  elapsedDays: number
  /** 무료 보관 만료까지 남은 일수 (음수면 초과 일수). */
  remainingDays: number
  /** ok = 여유, warn = 임박(만료 N일 이내), over = 무료기간 초과. */
  level: StorageLevel
  /** 적용된 무료 보관일. */
  freeDays: number
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * 배대지 접수 시각과 현재 시각으로 보관 상태 계산.
 * submittedAt 이 없거나 파싱 불가면 null (계산 불가).
 */
export function computeStorageStatus(
  submittedAt: string | null | undefined,
  now: Date,
  freeDays: number = DEFAULT_FREE_STORAGE_DAYS,
): StorageStatus | null {
  if (!submittedAt) return null
  const start = new Date(submittedAt)
  if (Number.isNaN(start.getTime())) return null

  const elapsedDays = Math.floor((now.getTime() - start.getTime()) / DAY_MS)
  const safeElapsed = elapsedDays < 0 ? 0 : elapsedDays
  const remainingDays = freeDays - safeElapsed

  let level: StorageLevel
  if (remainingDays <= 0) level = 'over'
  else if (remainingDays <= STORAGE_WARN_WITHIN_DAYS) level = 'warn'
  else level = 'ok'

  return { elapsedDays: safeElapsed, remainingDays, level, freeDays }
}
