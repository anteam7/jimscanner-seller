# 세션 로그

새 세션 끝나면 한 줄 요약 추가하세요.

---

## 2026-05-15 (분리 + 디자인 v2.1)

세션 1 — 메인 repo 에서 분리·셋업 (해당 작업 컨텍스트는 main repo `_memory/` 또는 사용자 메모리에 있음):

- 자율빌드 cron 113 commits squash merge 해서 main 에 통합 (`a5c75ad`)
- 새 repo `jimscanner-seller` 분리 + URL 평탄화 (`/seller/*` → `/`)
- main repo 의 (b2b) 코드 제거 (cleanup commit `bfa487f`, push 보류)
- GitHub `anteam7/jimscanner-seller` push (`51cffa3`)
- Vercel 새 project 생성 + 5개 env 등록 + framework=nextjs + redeploy → READY
- 로그인 페이지 정상 동작 확인

세션 2 — 디자인 v2 (라이트 톤 한국 sellers SaaS) 적용:

- globals.css 토큰 재정의 + Pretendard 적용
- SellerShell 라이트 메인 + 다크 사이드바 분리
- 27 파일 sed 일괄 색 토큰 swap
- AnnouncementBanner 4 variant 수동 정합

세션 3 — v2.1 강화 (입체감·정체성·여백·보조 색):

- dashboard proto: shadow-sm + gradient banner + accent border + 빠른 작업 카드
- 전 페이지 sed: h1 tracking-tight, p-6→p-8, shadow-sm 카드, signup/login subtitle 진하게
- pricing/settings 수동 강화 (카드 그리드, max-w 확장)
- 짐스캐너 B2C 로고 그대로 사용 (브라이트니스 0 + invert 로 다크 사이드바 호환)

다음 세션: Stage 2b 주문 관리 MVP. 자세한 건 `_memory/next-steps.md`.

---

## 2026-05-15 (Stage 2b — 주문 관리 MVP UI 골격)

- `src/app/(app)/orders/page.tsx` — 목록 (server): 상태 필터 7종 핍 그룹, 주문번호 검색, 빈상태 카드, hover row, status badge 10종, 50건 limit
- `src/app/(app)/orders/new/page.tsx` — 수동 입력 폼 (client): order_number 자동 생성, 의뢰자명, 상품 1건(MVP), USD/JPY/CNY/EUR/KRW, 합계 자동 계산
- `src/app/api/orders/route.ts` — POST(create + 의뢰자 자동 upsert + 쿼터·grace period 체크 + 라인 아이템) + GET(목록)
- `SellerShell.tsx` — NAV `/orders` available=true 활성
- `dashboard/page.tsx` — "새 주문 입력" QuickAction 활성
- 쿼터 트리거 `tg_b2b_order_quota_increment` 가 DB 에 이미 있음(b2b_schema.sql L907) — API 에서 명시적 increment 불필요
- `npm run build` 통과, 28 page

남은 작업: orders/[id] 상세, ForwarderExportModal, 33 배대지 spec seed. next-steps 참조.

---

## 2026-05-15 (도메인 재정의 + Phase A~D 완료 + 마이그 직접 적용)

세션 5 — dogfood → 도메인 재정의 → Phase A~D 일괄 + 메모리 학습:

### 1) Dogfood 시도·발견 (Chrome DevTools MCP)
- Vercel SSO + Supabase 로그인 2단계 가드를 사용자가 직접 통과, /orders/new → POST → /orders 흐름 정상 확인
- /orders/[id] 상세 페이지가 404 라서 즉시 작성 (커밋 `d4c3a63`)
- 상태 변경 PATCH 호출 → "사업자 계정이 없습니다" 에러 발견. 원인: `b2b_accounts.select` 에서 schema 에 없는 `withdrawal_notice_*` 컬럼 요청 → single() 실패

### 2) 도메인 전제 정정 (사용자 정정, 결정적 순간)
- **기존 (잘못된 가정)**: 구매대행 사업자 ← 의뢰자(C) 직접 카카오 등으로 주문 받음 → 해외 매입 → 의뢰자에게 배송
- **실제**:
  ```
  국내 마켓 (쿠팡·스마트스토어·옥션·지마켓·자사몰) ← 마켓 구매자(C)
      ↓ 셀러가 주문 처리
  해외 매입 (미국아마존·일본아마존·라쿠텐·타오바오 등)
      ↓ 셀러가 매입
  국내 배대지 (33개 중 1개 선택) — 셀러 본인 명의
      ↓ 양식 변환 (수신자 = 마켓 구매자)
  마켓 구매자 ← 직배송
  ```
- 핵심 차이:
  - "의뢰자(b2b_clients)" 폐기 → "마켓 구매자(buyer_*)" 1회성 PII 가 주문에 직접
  - 마켓·마켓주문번호가 1차 식별자 (셀러 내부 order_number 보다 중요)
  - 한 마켓 주문 = N 해외 매입 라인 (라인마다 supplier_site)
  - 배대지 양식 변환의 입력값: 구매자 PII + 라인 아이템 + 매입 사이트
- SKU 매칭: **선택사항** (선등록/즉석/없음 모두 가능, 소급도 가능)
- v0 범위: 수동 입력 / v1: 마켓 API 자동 수집 / 가격비교·재고: 추후

### 3) Phase A~D 일괄 (commits `b9c52da`, `4394fef`, `d103bb7`)

**Phase A (`b9c52da`)**:
- CLAUDE.md / _memory/*.md 도메인 문장 정정
- DB 마이그 `supabase/b2b_orders_market_fields.sql` 작성
- PATCH route 의 `withdrawal_notice_*` select 제거 + triggerWithdrawalNotice 함수 본체 제거 (v0 비활성, v0.5+ 마켓 정책 정합 후 재활성. git history 보존)

**Phase B (`4394fef`)**:
- `/api/orders` POST: 마켓 13종·해외 사이트 24종 화이트리스트, buyer_* 8필드, forwarder_id, line item 의 supplier/sale/option/product_id 처리. 의뢰자 자동 upsert 폐기
- `/api/orders` GET: marketplace 필터 + (셀러/마켓) 주문번호 OR 검색
- `/orders/new` 4 섹션 (마켓 / 구매자 / 해외 매입 / 배대지+메모) — 매입 합계 외화 자동 계산
- `/orders` 목록: 마켓·마켓번호·구매자·상품·상태·판매가·주문일. 상태 필터 8종 + 마켓 dropdown
- `/orders/[id]` 상세: 헤더 H1=마켓번호(fallback 셀러번호), 마켓+구매자 카드 (emerald accent), 해외 매입 카드 (sky accent, supplier chip + 매입가·판매가 분리), 사이드바 (상태 변경 / 배대지 / 양식 변환 placeholder / 비용 / 메타)

**Phase C (B 와 같이)**:
- enum 그대로, 라벨만 셀러 관점: pending=마켓 주문 접수, confirmed=매입 발주 완료, paid=해외 매입 완료, forwarder_submitted=배대지 입고, in_transit=한국행 운송 중, arrived_korea=한국 통관, delivered=구매자 수령, completed=구매 확정
- OrderStatusSelector + 상세/목록 STATUS_META 모두 정렬

**Phase D (`d103bb7`)**:
- main repo schema (`/c/Web/jimscanner/jimpass-agent-platform/supabase/schema.sql`) 에 forwarders 테이블 + 10개 시드 (짐패스/몰테일/이하넥스/유니옥션 등) 이미 존재 — 신규 시드 마이그 불필요
- `/orders/new` 를 server wrapper + client form(NewOrderForm.tsx) 으로 분리, forwarders.is_active 조회 후 props 전달
- ④ 섹션에 배대지 dropdown 추가 + forwarder_country 병행
- `/orders/[id]` 에 forwarders(name, slug) join, 배대지 이름 표시

### 4) DB 마이그레이션 **직접 적용** (Supabase MCP)
- `mcp__plugin_supabase_supabase__apply_migration` 으로 17개 컬럼 + 2 check + 3 index 모두 prod (`obxvucyhzlakensopalf`) 에 적용 완료
- 검증 쿼리로 17개 컬럼 모두 present 확인
- **메모리 학습**: 사용자 명시 — "이 프로젝트의 SQL 적용은 직접 한다는걸 잘 기억해놔". MEMORY.md 에 `feedback_db_migrations_apply_directly.md` 저장. 다음 세션부터 자동 반영. idempotent · non-destructive 는 사전 승인 불요, DROP/TRUNCATE 등은 사전 확인.

### 5) 미해결·다음 세션 대기
- Phase A~D 코드 + DB 모두 prod 반영. 다음 세션에서 dogfood 검증 (사용자 직접 마켓 주문 1건 등록 후 4 섹션 폼 / 목록 / 상세 / 상태 변경 확인)
- v0.5+ 큐: 33 양식 변환 (P1), SKU 마스터 (b2b_products + 매핑 테이블), 다상품 라인 add/remove, 마진 자동 계산 (환율 곱), 마켓 API 자동 import, 가격 비교, 재고 관리

---

## 2026-05-16 (일괄 입력 기능)

세션 6 — 셀러의 핵심 일상 워크플로우 = 매일 N건 마켓 주문을 한 번에 등록.

DB:
- `b2b_orders.forwarder_warehouse text` 컬럼 추가 — 같은 배대지 내 창고/센터 식별 (예: 몰테일 NJ·DE·CA, 짐패스 OR). prod 직접 적용 + `supabase/b2b_orders_forwarder_warehouse.sql` 파일 보존.

API:
- `src/app/api/orders/bulk/route.ts` — POST 만. body: `{ rows: [...] }`. 행별 normalize + 검증(필수: product_name, enum 검증 marketplace/supplier_site/currency/forwarder_country, UUID 검증 forwarder_id), 쿼터 + grace 사전 체크 (validRows 합산 vs 한도), 행 단위 insert (Supabase 트랜잭션 미지원이라 행별 격리, 라인 실패 시 주문 롤백 시도). source='excel_upload'. 결과 `{ ok, success_count, fail_count, results: [{index, ok, error?, order_number?}] }` 형태로 207 또는 201.

UI (`/orders/bulk`):
- server wrapper(page.tsx, forwarders 조회) + client(BulkOrderClient.tsx, 그리드)
- 27 컬럼 정의 (마켓 4·구매자 6·상품/매입 12·배대지 2·기타 3) — 사용자 요청 25 + 마켓옵션·매입주문번호 추가
- 그룹 헤더 (5 그룹) 위에 컬럼 라벨 헤더, 그룹 별 accent 색 (indigo/emerald/sky/amber/slate)
- 셀별 input 타입: text·number·date·select (select 는 dropdown — marketplace 13·supplier 24·currency 7·forwarder country 7·forwarders 동적)
- 행 좌측 sticky 번호 + 우측 삭제 버튼
- 컨트롤 바: +5행 / +1행 / 엑셀 붙여넣기 토글 / CSV 템플릿 다운 / 전체 비우기
- paste 영역: TSV(탭) 자동 감지, CSV 폴백. 헤더 한국어 라벨↔key 매핑. 헤더 없으면 컬럼 순서로 매핑. 기존 빈 행 제거 후 추가.
- CSV 템플릿: 27 헤더 + 샘플 1행 (BOM 포함 UTF-8 — 엑셀 한글 보호)
- 행별 실시간 검증: 비빈 행에 필수값(★) 누락 시 빨강 셀 + 행 배경 amber + 통계 카운터
- 통계 chip 3종: 입력 행 / 유효 / 누락
- 등록 후 결과 배너: 전부 성공 → 1.5초 후 /orders 이동, 부분 성공 → 행별 배경색 변경 (성공 emerald, 실패 rose) + 실패 사유 리스트

진입:
- `/orders` 헤더에 "일괄 입력" 보조 버튼 + "새 주문 입력" 메인
- 빈상태 카드에 둘 다 CTA

빌드: 30 page (`/orders/bulk` + `/api/orders/bulk` 추가). 통과.

설계 메모 (다음 세션 컨텍스트):
- 그리드 셀 type=number 와 select 가 한 행에 섞여 있어 paste 시 dropdown enum 값 (예: "쿠팡") 이 라벨 형태로 들어오면 매칭 안 됨. 현재는 enum value (`coupang`) 만 허용. v0.5+ 에서 라벨→value reverse lookup 보강 가능.
- 한 row = 1 주문 + 1 라인 아이템 가정. 한 마켓 주문에 여러 라인이 필요한 경우 별도 행을 같은 market_order_number 로 묶거나, 다상품 add/remove UI (v0.5) 추가 필요.
- 쿼터 사전 체크는 normalize 후 valid 행 수 기준. 부분 등록은 안 함 (전체 등록 또는 전체 거부 — 안전).
- supabase 의 from().insert([...]) batch 가 트랜잭션 보장 안 함. 50건 이상 처리 시 행별 순차 insert 의 latency 가 누적될 수 있음 — v0.5+ 에서 server function 또는 batched insert + 실패 retry 로 최적화 가능.
