-- 2026-05-25: 24h 자율 agent — STOP&ASK 결정 추적 컬럼.
-- 참조: _memory/agent-decision-rules.md
ALTER TABLE b2b_auto_runs
  ADD COLUMN IF NOT EXISTS decision_needed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS decision_issue_number integer,
  ADD COLUMN IF NOT EXISTS decision_resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS decision_resolution text
    CHECK (decision_resolution IS NULL OR decision_resolution = ANY (ARRAY['approve','deny','skip','timeout']));

CREATE INDEX IF NOT EXISTS b2b_auto_runs_decision_needed_idx
  ON b2b_auto_runs (decision_needed, decision_resolved_at)
  WHERE decision_needed = true;
