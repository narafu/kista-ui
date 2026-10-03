// 두 커밋의 화면을 같은 데이터로 띄워 픽셀 비교한다. 사용법은 같은 디렉토리 README.md
// 안전장치: kista-api(8080)·kista-trading(8081)은 기동하지 않고 확인만, 프록시는 GET만 통과,
// 내가 띄운 next dev 프로세스 그룹만 종료(포트가 이미 점유돼 있으면 다른 세션으로 보고 중단)
import { spawn, execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { startProxy } from './proxy.mjs'
import * as tradingFixture from './fixtures/trading.mjs'
import { scenarios as allScenarios } from './scenarios.mjs'
import { seed } from '../shared/seed.mjs'
import { shoot } from './shoot.mjs'

const UPSTREAM = { api: 'http://localhost:8080', trading: 'http://localhost:8081' }
const PORTS = { head: 3100, base: 3200, api: 8180, trading: 8181 }
const READY_TIMEOUT_MS = 180_000

const { positionals, values: opts } = parseArgs({
  allowPositionals: true,
  options: {
    head: { type: 'string', default: 'HEAD' },
    only: { type: 'string' },
    out: { type: 'string' },
    list: { type: 'boolean' },
    dirty: { type: 'boolean' },
    path: { type: 'string', multiple: true },
  },
})

if (opts.list) {
  for (const s of allScenarios) console.log(s.name.padEnd(36), typeof s.path === 'function' ? s.path({ assetSnapshotId: '<조회>' }) : s.path)
  process.exit(0)
}
if (positionals.length !== 1) {
  console.error('usage: npm run visual-diff -- <base-ref> [--head <ref>] [--dirty [--path <pathspec>]...] [--only <regex>] [--out <dir>] [--list]')
  process.exit(2)
}
if (opts.path && !opts.dirty) {
  console.error('--path는 --dirty와 함께만 쓴다')
  process.exit(2)
}

const repo = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).trim()
const sha = (ref) => git('rev-parse', '--verify', `${ref}^{commit}`)
const outDir = path.resolve(opts.out ?? path.join(os.tmpdir(), 'kista-visual-diff', new Date().toISOString().replace(/[:.]/g, '-')))
mkdirSync(outDir, { recursive: true })
const proxyLog = openSync(path.join(outDir, 'proxy.log'), 'a')
const log = (msg) => console.log(msg)
const plog = (msg) => writeFileSync(proxyLog, msg + '\n')

const portInUse = (port) => new Promise((resolve) => {
  const sock = net.connect({ port, host: 'localhost' })
  sock.once('connect', () => { sock.destroy(); resolve(true) })
  sock.once('error', () => resolve(false))
})
const reachable = (url) => fetch(url, { signal: AbortSignal.timeout(5000) }).then(() => true, () => false)

// ---- 정리: 내가 만든 것만 ----
const children = []
const proxies = []
const worktrees = []
let cleaning
// 시그널 핸들러와 finally가 같은 promise를 기다린다 — 먼저 끝난 쪽이 process.exit로 정리를 끊지 않도록
const cleanup = () => (cleaning ??= (async () => {
  // leader가 이미 죽었어도 그룹에 남은 worker가 있을 수 있어 SIGTERM은 항상 시도(죽은 그룹이면 catch).
  // SIGKILL은 leader가 살아 있는 그룹만 — pgid 재사용으로 남의 프로세스를 강제 종료하지 않도록
  for (const child of children) { try { process.kill(-child.pid, 'SIGTERM') } catch {} }
  await new Promise((r) => setTimeout(r, 3000))
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) { try { process.kill(-child.pid, 'SIGKILL') } catch {} }
  }
  await Promise.all(proxies.map((s) => new Promise((r) => { s.close(r); s.closeAllConnections() })))
  for (const wt of worktrees) {
    try { git('worktree', 'remove', '--force', wt) } catch (e) { console.error(`worktree 제거 실패: ${wt} ${e.message}`) }
  }
  try { git('worktree', 'prune') } catch {}
})())
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => cleanup().finally(() => process.exit(130)))

// 메인 트리의 커밋 안 된 변경(untracked 포함, .gitignore 제외)을 실행 시작 시점에 한 번만 patch로 뜬다.
// 임시 index라 메인 index(동시 세션이 staged한 것 포함)는 건드리지 않는다. pathspec으로 남의 변경을 걸러낸다
function snapshotDirty(commit, pathspecs) {
  const index = path.join(outDir, 'dirty.index')
  const env = { ...process.env, GIT_INDEX_FILE: index }
  const g = (...args) => execFileSync('git', ['-C', repo, ...args], { env, maxBuffer: 256 * 1024 * 1024 })
  try {
    g('read-tree', commit)
    // --out이 레포 안이면 이 도구의 산출물(dirty.index·로그·남은 worktree)이 patch에 섞이지 않게 뺀다
    const rel = path.relative(repo, outDir)
    const exclude = rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? [`:(exclude)${rel}`] : []
    g('add', '-A', '--', ...pathspecs, ...exclude)
    // porcelain diff는 diff.noprefix·diff.external·textconv 설정을 타서 apply 불가 patch가 될 수 있어 plumbing 사용
    const patch = g('diff-index', '--cached', '-p', '--binary', commit)
    if (!patch.length) throw new Error(`--dirty: ${pathspecs.join(' ')} 범위에 커밋 안 된 변경 없음`)
    const file = path.join(outDir, 'dirty.patch')
    writeFileSync(file, patch)
    log(g('diff', '--cached', '--stat', commit).toString().trimEnd())
    return file
  } finally {
    rmSync(index, { force: true })
  }
}

async function addWorktree(label, commit) {
  const dir = path.join(outDir, `wt-${label}`)
  git('worktree', 'add', '--detach', dir, commit)
  worktrees.push(dir)
  // APFS clone(-c)라 node_modules 복사가 빠르고 디스크를 거의 안 쓴다. 비-APFS면 일반 복사로 폴백
  try { execFileSync('cp', ['-Rc', path.join(repo, 'node_modules'), dir]) } catch { cpSync(path.join(repo, 'node_modules'), path.join(dir, 'node_modules'), { recursive: true }) }
  for (const f of ['.env', '.env.local']) if (existsSync(path.join(repo, f))) cpSync(path.join(repo, f), path.join(dir, f))
  return dir
}

function startNext(label, dir, port) {
  const logFile = path.join(outDir, `${label}.log`)
  const fd = openSync(logFile, 'a')
  // 셸 env가 .env보다 우선 — API 호출을 프록시로 돌린다
  // NEXT_PUBLIC_*도 덮는다 — 복사한 .env의 8080 직결 값으로 폴백해 GET 전용 프록시를 우회하는 경로를 막는다
  const api = `http://localhost:${PORTS.api}`, trading = `http://localhost:${PORTS.trading}`
  const env = { ...process.env, API_BASE_URL: api, NEXT_PUBLIC_API_BASE_URL: api, TRADING_API_BASE_URL: trading, NEXT_PUBLIC_TRADING_API_BASE_URL: trading }
  const child = spawn(path.join(dir, 'node_modules/.bin/next'), ['dev', '--turbopack', '-p', String(port)], { cwd: dir, env, detached: true, stdio: ['ignore', fd, fd] })
  children.push(child)
  return { child, logFile }
}

async function waitReady({ child, logFile }, port) {
  const deadline = Date.now() + READY_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`next dev(:${port}) 종료됨 — ${logFile}\n${readFileSync(logFile, 'utf8').slice(-1500)}`)
    try {
      // /api/health가 없는 옛 커밋(760324fe 이전)도 있어 어떤 HTTP 응답이든 준비 완료로 본다
      await fetch(`http://localhost:${port}/login`, { redirect: 'manual', signal: AbortSignal.timeout(30_000) })
      return
    } catch {}
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error(`next dev(:${port}) 준비 시간 초과 — ${logFile}`)
}

async function devToken(endpoint) {
  // dev 토큰 발급은 8080에 직접 POST(프록시는 쓰기를 막는다). local 프로파일 전용 엔드포인트
  const r = await fetch(`${UPSTREAM.api}/api/auth/${endpoint}`, { method: 'POST' })
  if (!r.ok) throw new Error(`${endpoint} 발급 실패(${r.status}) — kista-api가 local 프로파일로 떠 있는지 확인`)
  return (await r.json()).accessToken
}

// 시나리오 경로에 필요한 실데이터 id — 8080 직접 GET
async function resolveContext(token) {
  const r = await fetch(`${UPSTREAM.api}/api/finance/asset-snapshots`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) })
  const list = r.ok ? await r.json() : []
  const first = Array.isArray(list) ? list[0] : undefined
  return { assetSnapshotId: seed.assetSnapshotId ?? first?.id ?? 'missing-asset-snapshot' }
}

// 첫 Turbopack 컴파일이 느려 촬영 대기 시간 안에 안 끝날 수 있다 — 경로마다 한 번씩 미리 연다
async function warmUp(port, scenarios, tokens) {
  const seen = new Set()
  for (const s of scenarios) {
    const key = `${s.path}|${!!s.admin}`
    if (seen.has(key)) continue
    seen.add(key)
    const cookie = `kista-token=${s.admin ? tokens.admin : tokens.user}`
    await fetch(`http://localhost:${port}${s.path}`, { headers: { cookie }, redirect: 'manual', signal: AbortSignal.timeout(120_000) }).catch(() => {})
  }
}

function summarize(report) {
  const bad = report.filter((l) => l.diff !== 0 || l.newErrs.length || l.head.url !== l.base.url || l.head.status !== l.base.status)
  log(`\n== ${report.length}쌍 중 차이 ${bad.length}건 — 결과: ${outDir}`)
  for (const l of bad) {
    log(`  ${l.name} ${l.vp}: diff=${l.diff} status=${l.head.status}/${l.base.status} url=${l.head.url}${l.head.url !== l.base.url ? ` (base ${l.base.url})` : ''}`)
    for (const e of l.newErrs.slice(0, 3)) log(`    NEW ERR: ${e.slice(0, 200)}`)
  }
  return bad.length
}

let exitCode = 1
try {
  const only = opts.only ? new RegExp(opts.only) : null
  const selected = allScenarios.filter((s) => !only || only.test(s.name))
  if (!selected.length) throw new Error(`--only '${opts.only}'에 맞는 시나리오 없음 (--list로 확인)`)
  // HEAD는 여기서 한 번만 고정 — 동시 세션이 실행 중 커밋해도 worktree·patch 기준이 어긋나지 않게
  const commits = { head: sha(opts.head), base: sha(positionals[0]) }
  if (opts.dirty && commits.head !== sha('HEAD')) throw new Error('--dirty는 --head가 현재 HEAD일 때만 쓸 수 있다(patch 기준이 작업 트리의 커밋)')
  const dirtyPatch = opts.dirty ? snapshotDirty(commits.head, opts.path ?? ['.']) : null

  for (const [name, url] of Object.entries(UPSTREAM)) {
    if (!(await reachable(url))) throw new Error(`${name}(${url}) 응답 없음 — 이 도구는 백엔드를 기동하지 않는다. 직접 띄운 뒤 다시 실행`)
  }
  for (const [name, port] of Object.entries(PORTS)) {
    if (await portInUse(port)) throw new Error(`포트 ${port}(${name}) 사용 중 — 다른 세션이 이 도구를 돌리는 중일 수 있다. 종료하지 않고 중단`)
  }
  const tokens = { user: await devToken('dev-token'), admin: await devToken('dev-admin-token') }
  const ctx = await resolveContext(tokens.user)
  const scenarios = selected.map((s) => ({ ...s, path: typeof s.path === 'function' ? s.path(ctx) : s.path }))

  proxies.push(await startProxy({ name: 'apiproxy', port: PORTS.api, upstream: UPSTREAM.api, log: plog }))
  proxies.push(await startProxy({ name: 'tradingproxy', port: PORTS.trading, upstream: UPSTREAM.trading, route: tradingFixture.route, log: plog }))

  log(`head ${commits.head.slice(0, 8)}${dirtyPatch ? '+dirty' : ''} vs base ${commits.base.slice(0, 8)} — 시나리오 ${scenarios.length}개, 작업 트리 구성 중`)
  const servers = {}
  for (const label of ['head', 'base']) {
    const dir = await addWorktree(label, commits[label])
    if (label === 'head' && dirtyPatch) git('-C', dir, 'apply', '--binary', dirtyPatch)
    servers[label] = startNext(label, dir, PORTS[label])
  }
  await Promise.all(Object.entries(servers).map(([label, s]) => waitReady(s, PORTS[label])))
  log('dev 서버 준비 완료, warm-up 중')
  await Promise.all(['head', 'base'].map((label) => warmUp(PORTS[label], scenarios, tokens)))

  const report = await shoot({
    scenarios, tokens, log,
    servers: { head: PORTS.head, base: PORTS.base },
    outDir: path.join(outDir, 'shots'),
    setMode: tradingFixture.setMode,
  })
  writeFileSync(path.join(outDir, 'report.json'), JSON.stringify({ commits, dirtyPatch, report }, null, 1))
  exitCode = summarize(report) ? 1 : 0
} catch (e) {
  console.error(`\n중단: ${e.message}`)
} finally {
  await cleanup()
}
process.exit(exitCode)
