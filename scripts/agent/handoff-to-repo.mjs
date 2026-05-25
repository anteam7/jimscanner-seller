#!/usr/bin/env node
/**
 * Cross-repo work handoff.
 * 이 repo agent 가 다른 repo 의 코드 변경이 필요한 작업을 발견했을 때
 * 그 repo 에 issue 를 만들어 "다른 repo agent" 가 처리하도록 위임.
 *
 * Usage:
 *   node scripts/agent/handoff-to-repo.mjs \
 *     --to-repo owner/repo \
 *     --title "..." \
 *     --body "..." \
 *     [--labels "agent-handoff-from-seller,priority-high"] \
 *     [--spec-key "phase0-admin-health-page"] \
 *     [--from-context "이 repo 의 어떤 작업에서 발생"]
 *
 * Env (.env.local):
 *   AGENT_GITHUB_TOKEN — repo scope PAT (대상 repo 도 접근 가능해야)
 *   AGENT_GITHUB_REPO  — 자기 repo (출처 식별용, 기본 anteam7/jimscanner-seller)
 *
 * Behavior:
 *   - spec-key 있으면 같은 spec-key 의 open issue 가 이미 있는지 검색 → 있으면 skip (dedup)
 *   - body footer 에 metadata: from-repo, spec-key, created-at, from-context
 *
 * Output:
 *   stdout: created (or existing) issue number
 *   stderr: html_url 또는 'skipped: existing issue #N'
 *   exit 0 on success, non-zero on error
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
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
  const args = {}
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      args[a.slice(2)] = argv[i + 1]
      i++
    }
  }
  return args
}

async function findExistingBySpecKey({ token, toRepo, fromRepo, specKey }) {
  if (!specKey) return null
  // search API — open issues in target repo with the spec marker in body
  const marker = `spec_key: ${specKey}`
  const fromMarker = `from_repo: ${fromRepo}`
  const q = encodeURIComponent(
    `repo:${toRepo} is:issue is:open in:body "${marker}" "${fromMarker}"`,
  )
  const res = await fetch(`https://api.github.com/search/issues?q=${q}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.items?.[0] ?? null
}

async function main() {
  loadEnv()
  const args = parseArgs()
  const toRepo = args['to-repo']
  if (!toRepo || !args.title || !args.body) {
    console.error('Usage: --to-repo owner/repo --title <t> --body <b> [--labels a,b] [--spec-key k] [--from-context "..."]')
    process.exit(2)
  }
  const token = process.env.AGENT_GITHUB_TOKEN
  if (!token) {
    console.error('AGENT_GITHUB_TOKEN 미설정.')
    process.exit(3)
  }
  const fromRepo = process.env.AGENT_GITHUB_REPO || 'anteam7/jimscanner-seller'
  const specKey = args['spec-key'] || ''
  const fromContext = args['from-context'] || ''

  // Dedup
  if (specKey) {
    const existing = await findExistingBySpecKey({ token, toRepo, fromRepo, specKey })
    if (existing) {
      console.log(existing.number)
      console.error(`⏭️  skipped (already exists): #${existing.number} ${existing.html_url}`)
      process.exit(0)
    }
  }

  const labels = (args.labels || `agent-handoff-from-${fromRepo.split('/')[1] || 'unknown'}`)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const bodyWithMeta = `${args.body}

---
<!-- agent-handoff-meta
from_repo: ${fromRepo}
spec_key: ${specKey || 'unspecified'}
from_context: ${fromContext}
created_at: ${new Date().toISOString()}
created_by: agent-handoff
-->

> 이 issue 는 \`${fromRepo}\` 의 agent 가 자동 생성했습니다.
> 처리 후 댓글로 결과 (commit hash 등) 를 남기고 close 해주세요.`

  const body = JSON.stringify({ title: args.title, body: bodyWithMeta, labels })
  const res = await fetch(`https://api.github.com/repos/${toRepo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body,
  })
  if (!res.ok) {
    const err = await res.text()
    console.error(`GitHub API ${res.status}: ${err}`)
    process.exit(4)
  }
  const issue = await res.json()
  console.log(issue.number)
  console.error(`✅ handoff created: #${issue.number} → ${issue.html_url}`)
}

main().catch((e) => {
  console.error('handoff-to-repo.mjs failed:', e)
  process.exit(1)
})
