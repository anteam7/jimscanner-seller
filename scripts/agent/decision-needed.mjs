#!/usr/bin/env node
/**
 * Agent decision-needed helper.
 * STOP&ASK 트리거 시 GitHub issue 자동 생성.
 *
 * Usage:
 *   node scripts/agent/decision-needed.mjs \
 *     --title "..." --body "..." [--labels "a,b"] [--waiting-for-key "..."]
 *
 * Env (.env.local):
 *   AGENT_GITHUB_TOKEN — repo scope PAT
 *   AGENT_GITHUB_REPO  — owner/repo (default anteam7/jimscanner-seller)
 *
 * Output:
 *   stdout: created issue number (e.g. "23")
 *   exit 0 on success, non-zero on error
 *
 * 자율 agent 의 결정 흐름:
 *   1. 큐 항목 작업 중 STOP&ASK 트리거 발생
 *   2. 이 스크립트 호출 → issue 생성
 *   3. 큐의 해당 항목 status = "waiting_for: issue#<num>" 으로 갱신
 *   4. 다음 cron 회차에 이 issue 의 최근 댓글 읽어 진행 여부 판단
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

function parseArgs() {
  const args = { labels: 'agent-decision-needed' }
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const val = argv[i + 1]
      args[key] = val
      i++
    }
  }
  return args
}

async function main() {
  loadEnv()
  const args = parseArgs()
  if (!args.title || !args.body) {
    console.error('Usage: --title <t> --body <b> [--labels a,b] [--waiting-for-key k]')
    process.exit(2)
  }
  const token = process.env.AGENT_GITHUB_TOKEN
  if (!token) {
    console.error('AGENT_GITHUB_TOKEN 미설정. .env.local 에 PAT 추가 필요.')
    console.error('발급: https://github.com/settings/tokens/new?scopes=repo')
    process.exit(3)
  }
  const repo = process.env.AGENT_GITHUB_REPO || 'anteam7/jimscanner-seller'

  // body footer 에 metadata 추가 — 추후 agent 가 issue 조회 시 파싱
  const bodyWithMeta = `${args.body}

---
<!-- agent-meta
waiting_for_key: ${args['waiting-for-key'] || 'unspecified'}
created_at: ${new Date().toISOString()}
created_by: agent-cron
-->`

  const labels = (args.labels || 'agent-decision-needed')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: args.title,
      body: bodyWithMeta,
      labels,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error(`GitHub API ${res.status}: ${errText}`)
    process.exit(4)
  }

  const issue = await res.json()
  console.log(issue.number)
  console.error(`✅ created issue #${issue.number}: ${issue.html_url}`)
}

main().catch((e) => {
  console.error('decision-needed.mjs failed:', e)
  process.exit(1)
})
