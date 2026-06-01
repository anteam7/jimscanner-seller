# 셀러 기능 ↔ 오리지널 admin 관제 커버리지

짐스캐너 셀러 사이트(이 repo)와 오리지널 짐스캐너 사이트(`jimpass-agent-platform`)는 **관리자 페이지를 공유**한다.
→ 셀러가 제공하는 기능은 **오리지널 admin 에서 관제(모니터링·통제)** 되어야 한다.

이 메모는 `scripts/agent/admin-control-handoff-prompt.md` 크론의 **source of truth**:
- 셀러 기능별로 "오리지널 admin 이 가져야 할 관제 기능" 과 그 등록 상태를 추적
- 크론은 `status: 미등록` 첫 항목 1건을 골라 오리지널 repo 이슈로 핸드오프 → `issued` 로 갱신
- 오리지널 repo cron 이 그 이슈를 구현·close → 여기서 `done` 으로 갱신

상태값: `done(main 기존)` / `issued(main#N)` / `미등록` / `해당없음`

---

## 기존 admin 페이지 (오리지널 repo 에 이미 있음 — 재등록 금지)

CLAUDE.md §2 기준 오리지널 repo 운영 중:
- `/admin/b2b-accounts` — 셀러 계정 관제 (가입·인증·정지) → **done(main 기존)**
- `/admin/b2b-auto-runs` — 셀러 repo 자동 에이전트 실행 관제 → **done(main 기존)**
- `/admin/churn` — 이탈 관제 → **done(main 기존)**
- `/admin/support` — 셀러 지원 티켓 관제 → **done(main 기존)**

> 크론은 위 4개 도메인과 겹치는 관제는 새로 만들지 말 것. 보강이 필요하면 기존 페이지 "확장" 으로 spec 작성.

---

## 관제 대상 매트릭스 (셀러 기능 → admin 관제)

| spec_key | 셀러 기능(이 repo) | 오리지널 admin 관제 기능 | 데이터 소스(공유 DB) | status |
|---|---|---|---|---|
| `phase0-admin-health-page` | 셀러 health 스냅샷(#PH0-1~3) | 셀러 종합 health 모니터 페이지 `/admin/b2b/health` (4 KPI + row table) | `b2b_seller_health_snapshot` | **issued(main#3, 2026-05-27)** — main build 대기 |
| `admin-orders-pipeline` | 주문 관리·상태 전이·일괄입력 | 전 셀러 주문 처리 파이프라인 관제 (상태별 병목·정체 셀러) | `b2b_orders`,`b2b_order_items` | 미등록 |
| `admin-refunds-monitor` | 환불 관리(/refunds) | 전 셀러 환불 현황·승인 SLA·이상치 관제 | `b2b_refunds` | 미등록 |
| `admin-settlement-variance` | 배대지 정산 대조(/settlement) | 예측 대비 실청구 ±15% 이상 셀러·배대지 관제 | `b2b_orders.estimated/actual_cost_krw` | 미등록 |
| `admin-storage-risk` | 보관기간 deadline(/eta) | 배대지 보관비 임박·초과 위험 셀러 목록 관제 | `b2b_orders.forwarder_submitted_at` | 미등록 |
| `admin-margin-loss` | 마진 손실 경고(대시보드 H3) | 마진 손실 SKU·셀러 집계 관제 | `b2b_products`,`b2b_order_items` | 미등록 |
| `admin-billing-quota` | 구독·플랜·쿼터·카드(/billing,/settings/cards) | 셀러 구독/플랜/쿼터 사용률·결제 상태 관제 (b2b-accounts 와 분리된 재무 뷰) | `b2b_subscriptions`,`b2b_subscription_plans` | 미등록 |
| `admin-compliance-fail` | 청약철회 고지(/settings/compliance) | 고지 발송 실패·미완료 셀러 관제 + 재발송 | `b2b_withdrawal_notices` | 미등록 |
| `admin-onboarding-progress` | 온보딩·확장토큰·배대지주소 | 셀러 셋업 진행률(토큰/주소/첫주문/매칭) 관제 — 막힌 셀러 식별 | `b2b_seller_tokens`,`b2b_forwarder_addresses` 등 | 미등록 |
| `admin-market-stats` | 시장 집계(/analytics RPC) | 시장 가격 분포·이상 셀러(저가 경쟁) 관제 | `b2b_marketwide_supplier_stats` | 미등록 |

> 신규 셀러 기능이 추가되면 크론이 §2(인벤토리 갱신)에서 이 표에 행을 append 한다.

---

## 참고

- 핸드오프는 `scripts/agent/handoff-to-repo.mjs --to-repo anteam7/jimpass-agent-platform`. label `agent-handoff-from-seller,admin-control`. spec_key 로 자동 dedup.
- 오리지널 repo cron 이 `agent-handoff-from-seller` 라벨 이슈를 읽어 admin 에 구현해야 완성된다 (그 cron 은 `jimpass-agent-platform` repo 측 책임 — 현재 미가동 의심: main#3 가 2026-05-27 부터 미처리).
- 관제는 **셀러 전체 가로 집계** 라 admin/service_role 권한 (단일 셀러 RLS 아님). 셀러 PII 최소 노출.
