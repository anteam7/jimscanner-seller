# Admin Control Handoff Prompt (셀러→오리지널 관제 기능 등록)

**목적**: 짐스캐너 셀러 사이트(이 repo)와 오리지널 사이트(`jimpass-agent-platform`)는 **관리자(admin) 를 공유**한다.
셀러가 제공하는 기능은 오리지널 admin 에서 **관제(모니터링·통제)** 되어야 하므로 —
이 크론은 **셀러 기능을 분석 → 그 기능을 관제하는 admin 기능을 오리지널 repo 의 GitHub 이슈로 등록**한다.
오리지널 repo 의 cron 이 그 이슈(label `agent-handoff-from-seller`)를 읽어 admin 에 구현한다.

매 회차 **관제 1건** 등록 (커버리지 메모의 `미등록` 우선). issue 만 생성하고 종료 — 코드/큐는 안 건드림.

---

## 1. 시작 준비

1. `_memory/agent-decision-rules.md` read — 판단 기준 (NEVER·STOP&ASK)
2. `_memory/admin-control-coverage.md` read — **이 크론의 source of truth** (셀러 기능 ↔ 관제 매트릭스·상태)
3. `_memory/full-feature-roadmap.md` 훑기 + 최근 7일 git log — 최근 추가된 셀러 기능 파악
4. `AGENT_GITHUB_TOKEN` 확인 (없으면 종료 — 이슈 생성 불가)

## 2. 셀러 기능 인벤토리 갱신

- `src/app/(app)` 의 페이지·핵심 기능을 훑어 coverage 매트릭스에 **빠진 신규 셀러 기능**이 있으면 행 append
- 각 신규 기능에 "오리지널 admin 이 관제해야 할 것" 을 1줄 정의 + spec_key 부여 (`admin-<짧은키>`)

## 3. 중복 회피 (필수)

- coverage 메모에서 `done(main 기존)` / `issued` 인 항목은 **skip** (기존 admin 페이지와 겹치는 관제 재등록 금지 — §"기존 admin 페이지" 4개 특히 주의)
- `handoff-to-repo.mjs` 가 spec_key 로 메인 repo open/closed 이슈를 자동 dedup → 이미 있으면 생성 안 됨
- 하루에 같은 spec_key 반복 금지

## 4. 미등록 관제 1건 선택 → 오리지널 repo 핸드오프 이슈 생성

coverage 매트릭스에서 `미등록` 첫 항목(우선순위 위에서부터) 선택. 셀러측 해당 기능 코드를 1-2분 확인해 spec 을 구체화한 뒤:

```bash
node scripts/agent/handoff-to-repo.mjs \
  --to-repo anteam7/jimpass-agent-platform \
  --title "[from-seller] <관제 기능 한 줄 — admin 이 무엇을 관제>" \
  --body "$(cat <<'BODY'
## 배경 — 셀러 기능
셀러 사이트의 <기능명> — <무엇을 하는지 1-2줄>. (셀러측 페이지: `/...`, 파일: `src/...`)

## 오리지널 admin 에 추가할 관제 기능
- 위치: `/admin/...` (신규 페이지 또는 기존 섹션 확장)
- 무엇: 셀러 전체를 가로질러 <무엇을 모니터/통제>
- 화면: <KPI 카드 / row table / 필터 / 상세>
- 통제 액션(있으면): <정지·플랜변경·알림·내보내기 등>

## 데이터 소스 (공유 DB)
- `b2b_*` 테이블: <예: b2b_refunds, b2b_orders ...>
- 셀러 전체 집계 → **service_role/admin 권한** (단일 셀러 RLS 아님)

## 완료 기준
- `/admin/...` 접근 시 <화면> 표시 + admin 권한 가드
- 셀러 PII 최소 노출

## 참조
- 셀러측 기능 파일/페이지: `<경로>`
- 공유 스키마 변경 있었으면 commit 해시
BODY
)" \
  --labels "agent-handoff-from-seller,admin-control,priority-medium" \
  --spec-key "<coverage 메모의 spec_key>" \
  --from-context "admin-control-cron"
```

issue 번호가 stdout 으로 출력됨.

## 5. coverage 메모 업데이트

- 해당 행 status → `issued(main#<번호>, YYYY-MM-DD)` 로 갱신 + commit `chore(admin-control): <spec_key> 핸드오프 #N`

## 6. b2b_auto_runs 기록 (Supabase MCP execute_sql)

```sql
INSERT INTO b2b_auto_runs (mode, agent_type, task_picked, task_status, change_summary)
VALUES ('discovery', 'discovery', 'admin-control handoff <spec_key>', 'completed',
        '관제 핸드오프 main#<N> 생성: <기능>');
```
- `agent_type` 체크 제약: `builder`/`review`/`discovery` 만 허용 → `discovery` 사용.

## 7. 종료 조건

- coverage 매트릭스에 `미등록` 항목이 없으면 → 변경 없이 종료. 메모 끝에 "전 관제 등록 완료 (YYYY-MM-DD)" 1줄.
- 신규 셀러 기능이 생길 때만 다시 행이 추가되어 재가동.

## 8. 절대 하지 마

- 오리지널 repo 의 코드·파일 직접 commit (이 repo agent 는 이슈 핸드오프만)
- 기존 admin 4페이지(`b2b-accounts`/`b2b-auto-runs`/`churn`/`support`)와 겹치는 관제 재등록
- 같은 spec_key 중복 이슈

---

## 실행 시점

Windows 작업 스케줄러 `jimscanner-seller-admin-control` — **daily KST 04:30** 권장
(brainstorm 05:00 직전. cron-prompt 패턴과 동일, prompt 만 이 파일로):

```powershell
claude --dangerously-skip-permissions -p "scripts/agent/admin-control-handoff-prompt.md 의 instruction 을 따라 한 회차 작업하고 종료해."
```

> **상대편 필수**: 오리지널 repo(`jimpass-agent-platform`) 의 cron 이 `agent-handoff-from-seller` 라벨 이슈를 읽어
> admin 에 구현·close 해야 루프가 완성된다. 그 cron 이 없으면 이슈만 쌓인다 (현재 main#3 미처리 상태).
