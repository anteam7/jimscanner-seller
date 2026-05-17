# 자동 진행 큐 (cron 30분 간격)

cron 이 매 30분 fire → 첫 `pending` 항목 1개 처리 → commit + push → `done` 마킹.
모두 done 이면 cron 자동 종료.

전체 로드맵: [`full-feature-roadmap.md`](full-feature-roadmap.md)

---

## 진행 규칙 (cron prompt 가 따라야 할 표준)

1. 큐의 첫 `[ ]` (pending) 항목을 찾는다
2. 항목의 "작업" 내용대로 코드/DB 변경 → `npm run build` 통과 확인
3. commit 메시지: `feat/fix/refactor(cron-N): <짧은 설명>` 형식
4. push origin main
5. 이 파일에서 해당 항목을 `[x]` 로 변경하고 별도 commit (`chore(cron): N 완료`)
6. 큐에 더 pending 없으면 마지막에 `chore(cron): 큐 소진 — cron 자동 종료 권장` push 후 종료

작업 중 새 이슈 발견 시: 큐 끝에 추가 (pending 으로) 후 다음 cron 회차에 진행.

---

## Queue (우선순위 순)

### Phase 1 — 가벼운 보강 (5~30분)
- [x] **1. A1** signup 카운트 동기화 — `src/app/signup/page.tsx` 의 "33개/13개/24개/7종" → 실 카운트 (forwarders 30개, marketplaces 14개, supplier_sites 25개, currencies 8개). 또는 "30+개/13+개/24+개" 같은 안전 표기. 추후 forwarders 36 모두 활성 시 자동 반영되도록 server fetch 로 동적화 권장. ✅ d3fb2dd
- [ ] **2. F2** Pretendard preconnect — `globals.css` 의 @import url 을 `<link rel="preconnect">` + `<link rel="preload" as="style">` 로 분리 (`layout.tsx` head). FOIT 감소.
- [ ] **3. C8** 404 페이지 — `src/app/not-found.tsx` 작성 (v2.1 톤, 로고 + 짧은 카피 + "홈으로/주문으로" 링크).
- [ ] **4. G3** `/api/announcements/active` 정상화 — E1 후 후속이지만 단독 가능: 현재 graceful 빈 배열 반환. 일단 보존하되 빌드 로그에서 silent error 가능성 점검. 변경 없을 시 skip 결정 commit.
- [ ] **5. C5** `/pricing` 페이지 디자인 v2.1 — shadow-sm 카드, accent border-l, gradient banner, p-8 max-w-6xl, Pretendard tracking-tight. PricingCard 컴포넌트도 같이.
- [ ] **6. C7** `/login` 디자인 톤 — signup 의 그라데이션 배경 + 로고 PNG + dot pattern 일관성. 로그인 폼은 그대로 두고 헤더/푸터/배경만 통일.
- [ ] **7. C9** `auth/forgot-password`, `auth/reset-password`, `auth/mfa-challenge` 디자인 v2.1.
- [ ] **8. C6** `/settings` 페이지 디자인 v2.1 — 카드 그리드 2-col, shadow-sm hover:shadow-md. account/security/compliance 서브페이지도 일관성.

### Phase 2 — 운영 자동화 약속 (30~60분)
- [ ] **9. B4** dashboard 빈 상태 가이드 — 주문/SKU 0건 시 "3-step 시작하기" 카드. dashboard/page.tsx 상단에 조건부.
- [ ] **10. B1** 합배송 배송비 절감 추정 — BulkExportModal 에 "N건 합치면 배송비 1회 = ~M원 절감" 안내. M 은 배대지 평균 배송비 (5천원~만원 가정, 카피로만 처리).
- [ ] **11. B2** 마진율 경고 — NewOrderForm 의 마진 영역에 5% 미만 시 amber 경고. orders/[id] 의 비용 카드에도 동일.
- [ ] **12. C3** `b2b_order_items.image_url`, `tracking_number_overseas` 컬럼 — Supabase MCP apply_migration + NewOrderForm 라인에 입력 필드 추가 + orders/[id] 상세에 표시 + 짐패스 v1 시드 매핑 갱신 (이전엔 constant '').
- [ ] **13. C4** dashboard 통계 더 풍성 — 최근 주문 5건 row + 환율 미니 표 + status pipeline 미니 차트 (status 별 카운트).
- [ ] **14. F1** dashboard `unstable_cache` — 4쿼리 60초 캐싱 (account_id key). 트래픽 적어도 매 진입 비용 줄임.
- [ ] **15. E5** `/billing` 페이지 UI — 구독 플랜·used/limit 진행바·다음 갱신일·플랜 변경 링크. 결제 연동 X (UI만).
- [ ] **16. E1** `b2b_announcements` 테이블 + 시드 1개 — `supabase/b2b_announcements.sql` + `/api/announcements/active` 실제 데이터 반환. AnnouncementBanner 가 active=true 인 항목 표시.

### Phase 3 — 신규 기능 (60분~)
- [ ] **17. D5** 부가세 자료 CSV export — `/api/orders/export-csv` 월별 매출 합계 + 사업자등록증 형식. button 은 settings/compliance.
- [ ] **18. H2** 환율 변동 알림 — dashboard 에 "USD 매매기준율: 1380원 (+0.8% 전일)" 미니 배너. 전일 환율 캐싱은 b2b_subscriptions 같은 곳에 별도 저장 또는 client cookie.
- [ ] **19. C1** `/orders/bulk` SKU autocomplete (Phase 3) — grid 셀의 product_name 컬럼에 dropdown. SKU 선택 시 같은 row 의 supplier_site/currency/unit_price 자동 채움. (큰 작업이라 30분 단위로 안 끝나면 다음 cron 으로 이어 진행)
- [ ] **20. D3** 운송장 자동 트래킹 스키마 + 수동 입력 UI — `b2b_order_items.tracking_number` (이미 있음) + carrier 컬럼 추가 + /orders/[id] 운송장 입력 + 외부 트래킹 API 는 추후.
- [ ] **21. E4** 의뢰자 CRM (`/clients`) — 같은 phone+marketplace 2회 이상 등장한 buyer 를 자동 묶음 + 목록 페이지.
- [ ] **22. E2** 알림 센터 — DB 스키마 있음 (b2b_notifications 류 확인 후). 헤더 종 아이콘 + dropdown + 페이지.
- [ ] **23. E3** 1:1 문의 UI — 스키마 활용 + `/support` 페이지 (목록 + 작성).
- [ ] **24. D1** 어필리에이트 상품 추천 페이지 (`/recommendations`) — 일본·미국 trending mock 데이터 + 마진 예시. 실 어필리에이트 ID 는 추후.
- [ ] **25. H1** "잘 나가는 SKU" 추천 — analytics 페이지에 본인 데이터 기반 TOP + 익명 전체 셀러 평균 비교 (RLS 우회 필요한 부분만 별도 view).
- [ ] **26. H3** 마진 손실 알림 — SKU 별 default_unit_price + 현 환율로 환산해 sale_price_krw 보다 큰 경우 dashboard 배너.

### Phase 4 — 기술 부채 / 일관성
- [ ] **27. G1** Supabase generated types — main repo 의 `types/supabase.ts` 최신화 후 이 repo 로 copy. admin client `any` 캐스팅 일부 제거.
- [ ] **28. G2** monthly_order_used 월 초 reset cron 점검 — DB 의 schedule 함수 확인 + 없으면 Supabase cron 등록.
- [ ] **29. F3** form validation 일관성 — signup/login/settings 의 inline 에러 패턴 통일 (aria-invalid + rose 보더 + [11px] 메시지).
- [ ] **30. F4** WCAG AA 잔여 검토 — `_memory/b2b_auto_todo.md` 의 cron 발견 30+ 건 처리 (signup·login·security·pricing 등).
- [ ] **31. F5** 모바일 반응형 검토 — 사이드바 (현재 always visible 220px), 모달 (max-w-lg 가 작은 화면 OK?), 일괄 입력 그리드.

---

## 종료 조건

모든 항목 `[x]` → 다음 cron fire 시 큐 비었음을 감지 → `chore(cron): 큐 소진 — 자동 종료` commit/push 후 cron 비활성화 (CronDelete) 또는 idle 종료.

---

## 큐 진행 통계

- 총 항목: **31개**
- Phase 1 (가벼운): **8개**
- Phase 2 (자동화): **8개**
- Phase 3 (신규): **10개**
- Phase 4 (부채): **5개**
- 예상 총 시간: 약 18~22시간
- 30분 간격 × 31회차 = **15.5시간** (1세션 분량 무거운 건 2~3회차에 걸쳐 진행)
