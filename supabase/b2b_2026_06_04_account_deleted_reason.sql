-- 계정 자진 탈퇴 사유 컬럼 — account/delete route 버그 fix (#idle-6)
-- 적용: 2026-06-04 (Supabase MCP apply_migration b2b_accounts_deleted_reason)
--
-- src/app/api/account/delete/route.ts 가 탈퇴 처리 시 b2b_accounts 에
-- deleted_reason='self_requested' 를 UPDATE 하는데 해당 컬럼이 DB 에 없어
-- (createAdminClient() as any 캐스트가 타입 오류를 가려) UPDATE 가 런타임
-- PostgREST "column does not exist" 로 실패 → 탈퇴가 500 으로 깨져 있었음.
-- suspended_reason (정지 사유) 와 대칭되는 탈퇴 사유 컬럼을 추가해 의도대로 기록.
-- free-text (관리자측 churn 분석에서 다양한 사유를 기록할 수 있도록 CHECK 미부여 — suspended_reason 과 동일 정책).

ALTER TABLE public.b2b_accounts
  ADD COLUMN IF NOT EXISTS deleted_reason text;

COMMENT ON COLUMN public.b2b_accounts.deleted_reason IS
  '계정 탈퇴 사유 (예: self_requested = 셀러 자진 탈퇴). suspended_reason 와 대칭. account/delete route 및 어드민 churn 분석에서 기록.';
