#!/usr/bin/env node
/**
 * Agent — 특정 issue 의 사용자 답신 댓글 확인.
 * 큐의 waiting_for: issue#<num> 항목이 풀렸는지 매 cron 회차에 체크.
 *
 * Usage:
 *   node scripts/agent/check-decision-reply.mjs --issue 23
 *
 * Output (JSON):
 *   { state: "open|closed", reply: "<latest non-agent comment>" | null,
 *     decision: "approve|deny|skip|unknown", since: "<ISO>" }
 *
 * 사용자 답신 규칙 (issue 본문 또는 댓글 첫 줄):
 *   "approve" / "yes" / "ok" / "go" → 진행
 *   "deny" / "no" / "stop" → 큐 항목 cancel
 *   "skip" / "later" → 큐 끝으로 미루기
 *   그 외 → unknown (agent 가 본문 해석 시도)
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local')
  if (!existsSync(envPath)) return
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

function parseDecision(text) {
  const lower = (text || '').trim().toLowerCase()
  const firstLine = lower.split('\n')[0].trim()
  if (/^(approve|approved|yes|ok|go|진행|예|승인)/.test(firstLine)) return 'approve'
  if (/^(deny|denied|no|stop|중단|아니|거절)/.test(firstLine)) return 'deny'
  if (/^(skip|later|미루|나중|보류)/.test(firstLine)) return 'skip'
  return 'unknown'
}

async function main() {
  loadEnv()
  const argv = process.argv.slice(2)
  const issueIdx = argv.indexOf('--issue')
  if (issueIdx < 0 || !argv[issueIdx + 1]) {
    console.error('Usage: --issue <number>')
    process.exit(2)
  }
  const issueNumber = argv[issueIdx + 1]
  const token = process.env.AGENT_GITHUB_TOKEN
  if (!token) {
    console.error('AGENT_GITHUB_TOKEN 미설정.')
    process.exit(3)
  }
  const repo = process.env.AGENT_GITHUB_REPO || 'anteam7/jimscanner-seller'

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  const issueRes = await fetch(
    `https://api.github.com/repos/${repo}/issues/${issueNumber}`,
    { headers },
  )
  if (!issueRes.ok) {
    console.error(`issue fetch failed: ${issueRes.status}`)
    process.exit(4)
  }
  const issue = await issueRes.json()

  const commentsRes = await fetch(
    `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments?per_page=20`,
    { headers },
  )
  const comments = commentsRes.ok ? await commentsRes.json() : []

  // agent 가 만든 댓글 (body 에 <!-- agent-meta 있음) 제외 — 사용자 답신만
  const userComments = comments.filter(
    (c) => !(c.body || '').includes('<!-- agent-meta'),
  )
  const latest = userComments[userComments.length - 1]

  const reply = latest ? latest.body : null
  const decision = reply ? parseDecision(reply) : 'unknown'

  console.log(
    JSON.stringify({
      state: issue.state,
      reply,
      decision,
      since: latest?.created_at ?? issue.created_at,
    }),
  )
}

main().catch((e) => {
  console.error('check-decision-reply.mjs failed:', e)
  process.exit(1)
})
