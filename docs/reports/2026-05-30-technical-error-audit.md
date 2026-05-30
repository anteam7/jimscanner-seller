# 기술 오류 점검 리포트 — 2026-05-30

짐스캐너 SELLER (B2B) 전체 코드베이스의 기술적 오류(코드 오류·404·405·API 계약·DB silent bug·런타임 예외) 점검·수정 보고서.

- **점검 범위**: API route 61개, 페이지 56개, 소스 194개 파일 (src/ 전체)
- **방법**: 정적 컴파일/린트 → 병렬 교차참조 헌트(3 에이전트) → 런타임 스모크 스윕 → 직접 검증 → 수정 → 빌드/재검증
- **결과**: 확정 버그 **3건 발견·전건 수정·검증 완료**. 빌드/타입/린트 0 errors.

---

## 1. 베이스라인 (사전 상태)

| 검사 | 결과 |
|---|---|
| `tsc --noEmit` | 0 errors |
| `eslint` | 0 problems |

정적 컴파일·린트는 이미 깨끗(상시 cron 유지). 따라서 실제 위험은 **런타임·계약 레벨**(존재하지 않는 경로 링크, 미구현 메서드, DB 컬럼 불일치, 미처리 예외)로 좁혀 점검.

---

## 2. 점검 방법 (다단계)

1. **정적 교차참조 헌트** — 3개 병렬 에이전트
   - 404 헌트: 모든 `<Link>`·`router.push`·`redirect`·`<a>`·네비 메뉴 타깃 ↔ 실제 page 라우트 맵 대조
   - 405/계약 헌트: 모든 `fetch('/api/...')` 메서드·body ↔ route.ts export 메서드 대조
   - DB/런타임 헌트: 모든 Supabase 쿼리 컬럼 ↔ `types/supabase.ts` 대조 + 예외 위험 스캔
2. **런타임 스모크 스윕** — `next dev` 기동 후 정적 페이지 50개 + 의심 엔드포인트 HTTP 상태코드 실측 (404/405/500 분리, 302/401 은 정상)
3. **직접 검증** — 후보마다 해당 파일 직접 읽어 오탐 제거
4. **수정 + 재검증** — 원자적 커밋 → `tsc`/`lint`/`build` 재실행 → 런타임 재확인 → 독립 검증 에이전트로 회귀·누락 재점검

---

## 3. 발견·수정 내역

### 🔴 #1 [HIGH] 대시보드 구독 카드 silent 깨짐 — DB 컬럼 불일치

| | |
|---|---|
| 위치 | `src/lib/b2b/dashboard-data.ts:68` |
| 증상 | 모든 셀러의 대시보드 "주문 할당량/구독" 카드가 항상 `구독 정보 없음`·`—` 표시 |
| 원인 | `b2b_subscriptions` 에 **존재하지 않는 컬럼** `plan_code`·`monthly_order_limit` 를 select → PostgREST 400 → 쿼리 결과 null → `subscription = null` 로 떨어짐. 타입 체크를 통과해 컴파일 단계에서 안 잡힘(silent) |
| 실제 컬럼 | `monthly_order_used`, `monthly_order_quota_override` (월 한도는 `b2b_subscription_plans.monthly_order_quota` 조인 필요) |
| 수정 | `plan` 조인 select 로 교체 + `월 한도 = override ?? 플랜 quota`, `plan_code = 조인.plan_code` 파생 매핑. 검증된 sibling(`billing/page.tsx`) 패턴과 동일 |
| 커밋 | `2c9bb55` |

> **영향 분석**: 정적 타입이 느슨하게 통과해 오래 방치된 silent bug. 셀러가 자신의 이번 달 주문 사용량/한도를 대시보드에서 전혀 못 보던 상태였음. 수정으로 정상 표시 복원.

### 🟠 #2 [MED] 404 링크 `/resources`

| | |
|---|---|
| 위치 | `src/app/(app)/eta/page.tsx:245` |
| 증상 | ETA 페이지 '계산 기준'의 '시드값' 링크 클릭 시 404 |
| 원인 | `/resources` 페이지는 없고 `/resources/customs-guide` 만 존재 |
| 수정 | `href="/resources"` → `href="/resources/customs-guide"` |
| 커밋 | `d339e19` |

### 🟠 #3 [MED] 404 API `/api/billing/info`

| | |
|---|---|
| 위치 | 호출: `src/app/(app)/settings/account/delete/page.tsx:29` |
| 증상 | 계정 삭제 페이지에서 활성 구독 경고가 절대 표시되지 않음 |
| 원인 | `GET /api/billing/info` 를 호출하나 해당 라우트가 존재하지 않음(404). try/catch + `if(!res.ok) return` 으로 감싸져 **조용히 실패** → 유료 구독자가 계정 삭제 시 "활성 구독이 있다"는 경고를 못 봄 |
| 수정 | `src/app/api/billing/info/route.ts` 신규 생성. `{ subscription: { status, plan_code, plan_name, current_period_end } \| null }` 반환 (호출부가 기대하는 형태, `billing/cancel` 과 동일 auth 패턴) |
| 커밋 | `8e97cae` |

---

## 4. 검증 결과 (수정 후 재점검)

| 검사 | 결과 |
|---|---|
| `tsc --noEmit` | 0 errors |
| `eslint` | 0 problems |
| `npm run build` | exit 0 (전 라우트 생성) |
| 런타임: `/api/billing/info` | 404 → **401** (라우트 존재·auth-gated 정상) |
| 런타임: `/resources` 잔여 링크 | grep 결과 0건 (전부 제거) |
| 정적 페이지 50개 스윕 | 전부 200(공개)/307(인증 리다이렉트), **404·405·500 0건** |
| 독립 검증 에이전트 | 3건 모두 VERIFIED CORRECT, 동일 부류 재스캔 신규 발견 0 |

---

## 5. 검토했으나 오탐(false positive)으로 판정

| 후보 | 판정 |
|---|---|
| `TrackingEditor.tsx:65` PATCH `/api/orders/[id]/items/[itemId]/tracking` | 라우트 존재·PATCH export 확인 → **정상** |
| `verify-business/route.ts:61` 배열 접근 | `if(!item)` 가드 존재 → **안전** |
| 다수 `as any` 캐스트 | 타입 안전성 부채일 뿐 런타임 오류 아님. cron type-safety thread 가 점진 제거 중 → 본 점검 범위 외 |

---

## 6. 결론

- 코드베이스는 정적 품질(타입·린트)이 이미 잘 유지되어 있었고, 발견된 오류는 모두 **컴파일러가 못 잡는 런타임/계약 레벨** 3건이었음.
- 가장 영향이 컸던 것은 **#1 대시보드 구독 카드**(모든 셀러 노출, silent) — 정적 타입을 느슨하게 우회한 컬럼 불일치. 이런 부류는 `as any`/느슨한 typed client 가 남아있는 한 재발 가능 → cron 의 `as any` 제거 thread 가 근본 예방책.
- 3건 전부 수정·푸시·검증 완료. 후속 권고: DB 컬럼 silent bug 예방을 위해 admin client 쿼리의 typed-client 전환(진행 중) 지속.

*(생성: 2026-05-30, Claude Opus 4.8 — 기술 오류 점검 작업)*
