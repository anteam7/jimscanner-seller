import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../../types/supabase'

type AdminClient = SupabaseClient<Database>

/** 주문 상태가 어디서 바뀌었는지 구분 — 타임라인 라벨·아이콘 매핑에 사용 */
export type OrderStatusChangeVia = 'manual' | 'refund' | 'match' | 'auto'

/** 타임라인 카드가 읽어가는 audit_log action 값 (단일 source of truth) */
export const ORDER_STATUS_CHANGE_ACTION = 'order_status_changed'

export type OrderStatusChangeMeta = {
  from: string | null
  to: string
  via: OrderStatusChangeVia
  note?: string
}

/**
 * 주문 상태 변경을 b2b_audit_log 에 best-effort 기록한다.
 *
 * - audit insert 실패가 원래 트랜잭션(상태 변경 응답)을 막지 않도록 절대 throw 하지 않는다.
 * - PII(구매자 이름·주소·전화 등)는 metadata 에 넣지 않는다 — 상태 전이값과 출처만.
 * - service_role(admin) 클라이언트로 호출해야 RLS 우회 INSERT 가능.
 */
export async function logOrderStatusChange(
  admin: AdminClient,
  params: {
    accountId: string
    orderId: string
    from: string | null
    to: string
    userId?: string | null
    via?: OrderStatusChangeVia
    note?: string
  },
): Promise<void> {
  const { accountId, orderId, from, to, userId = null, via = 'manual', note } = params

  // from === to 면 실제 전이가 아니므로 기록 생략
  if (from === to) return

  const metadata: OrderStatusChangeMeta = { from, to, via }
  if (note) metadata.note = note

  try {
    const { error } = await admin.from('b2b_audit_log').insert({
      account_id: accountId,
      user_id: userId,
      action: ORDER_STATUS_CHANGE_ACTION,
      target_type: 'b2b_order',
      target_id: orderId,
      metadata,
    })
    if (error) {
      console.error('[audit] order status change log 실패:', error.message)
    }
  } catch (e) {
    console.error('[audit] order status change log 예외:', e)
  }
}
