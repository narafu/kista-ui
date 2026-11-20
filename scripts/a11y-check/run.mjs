// 접근성 회귀 점검: axe(PC·모바일 × 라이트·다크), 키보드 포커스 링, 다이얼로그·폼 다이얼로그 포커스 관리.
// 위반이 하나라도 있으면 exit 1. 사용법·전제·제외 규칙 근거는 같은 디렉토리 README.md
// 안전장치: 이미 떠 있는 dev 서버(--url)를 읽기만 한다 — 브라우저에서 나가는 GET/HEAD 외 요청은 전부 abort(로컬 DB 실데이터 보호).
// 예외는 계좌 등록 위저드의 연결 테스트 POST 하나로, 브라우저 안에서 가짜 응답을 돌려줘 서버에 도달하지 않는다
import { parseArgs } from 'node:util'
import { chromium } from '@playwright/test'
import axe from 'axe-core'
import { VIEWPORTS, authedContext, devToken } from '../shared/browser.mjs'
import { ROUTES, fill } from '../shared/routes.mjs'
import { resolveContext, seed, stubSeedCash } from '../shared/seed.mjs'

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']
const SETTLE_MS = 2500
// base-ui 포커스 가드는 비동기로 포커스를 되돌린다 — Tab 직후 바로 읽으면 가드 요소를 잡는 오탐
const TAB_WAIT_MS = 150
const MAX_TABS = 80

const WIZARD = '/accounts/new'

const { values: opts } = parseArgs({
  options: {
    url: { type: 'string' },
    only: { type: 'string' },
    skip: { type: 'string', default: '' },
  },
})
if (!opts.url) {
  console.error('usage: npm run a11y-check -- --url http://localhost:<dev 포트> [--only <경로 정규식>] [--skip axe,tab,dialog,modal]')
  process.exit(2)
}
const BASE = opts.url.replace(/\/$/, '')
const only = opts.only ? new RegExp(opts.only) : null
const skip = new Set(opts.skip.split(',').filter(Boolean))

const failures = []
const fail = (msg) => { failures.push(msg); console.log(`  ✗ ${msg}`) }

const newContext = (browser, token, vp, scheme, cookies) => authedContext(browser, {
  token, cookies, host: new URL(BASE).hostname, readOnly: BASE,
  viewport: VIEWPORTS[vp], colorScheme: scheme, isMobile: vp === 'mo', hasTouch: vp === 'mo',
})

// 표(shared/routes.mjs)의 행을 실제 경로로 채운다. 시드·데이터가 없어 못 채우는 행은 건너뛰고 끝에 알린다(실패 아님)
const skipped = []
const resolveRows = (role, ctx) => {
  const rows = []
  for (const row of ROUTES.filter((r) => r.role === role && !r.redirect)) {
    const path = fill(row, ctx)
    if (!path) skipped.push(`${role} ${row.path}`)
    else rows.push({ ...row, path })
  }
  return rows
}

async function open(page, path) {
  await page.goto(BASE + path, { waitUntil: 'load', timeout: 90_000 })
  // SSE(/api/trades/stream) 때문에 networkidle에 도달하지 않는다 — load + 고정 대기
  await page.waitForTimeout(SETTLE_MS)
  const landed = new URL(page.url()).pathname
  if (landed !== path.split('?')[0]) fail(`${path} → ${landed}로 리다이렉트됨 (토큰·시드 데이터 확인)`)
}

async function runAxe(page, scope) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: axe.source })
  return page.evaluate(([sel, tags]) => window.axe.run(sel ? [...document.querySelectorAll(sel)].pop() : document, { runOnly: { type: 'tag', values: tags } }), [scope, AXE_TAGS])
}

const describe = (v, n) => {
  const d = n.any[0]?.data
  return `${v.id}(${v.impact}) ${n.target.join(' ')}${d?.contrastRatio ? ` ratio=${d.contrastRatio} fg=${d.fgColor} bg=${d.bgColor}` : ''}`
}

// 포커스 링 판정: 포커스 전 상태와 비교한다. shadcn 컨트롤은 평소에도 shadow-xs가 있어 "boxShadow가 있다"만으론 항상 통과한다
async function checkTabOrder(page, path, vp) {
  await page.evaluate(() => {
    document.activeElement?.blur()
    window.scrollTo(0, 0)
    // outline-style이 none이면 폭·색이 바뀌어도 보이지 않는다(outline-none + focus 시 폭만 바뀌는 오탐).
    // 단위·기호를 품은 컨테이너가 focus-within으로 링을 그리는 입력(UnitInput·SeedAmountInput)이 있어 부모 2단계까지 본다.
    // 카드처럼 큰 래퍼의 hover·focus-within 변화가 링으로 오인되지 않도록 입력칸 크기(높이 64px 이하)인 부모만 센다
    const own = (el) => { const cs = getComputedStyle(el); const outline = cs.outlineStyle === 'none' ? 'none' : `${cs.outlineStyle}|${cs.outlineWidth}|${cs.outlineColor}`; return `${outline}|${cs.boxShadow}|${cs.borderColor}` }
    const fieldBox = (el) => el && el.getBoundingClientRect().height <= 64
    const style = (el) => [el, el.parentElement, el.parentElement?.parentElement].filter((n, i) => n && (i === 0 || fieldBox(n))).map(own).join('/')
    window.__a11yStyle = style
    window.__a11yRest = new WeakMap()
    for (const el of document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex],[contenteditable]')) window.__a11yRest.set(el, style(el))
  })
  const seen = new Set()
  let prev = null
  let repeats = 0
  for (let i = 0; i < MAX_TABS; i++) {
    await page.keyboard.press('Tab')
    await page.waitForTimeout(TAB_WAIT_MS)
    const info = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body || el.tagName === 'NEXTJS-PORTAL') return null
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      const rest = window.__a11yRest.get(el)
      // 점검 시작 뒤 렌더된 요소는 포커스 전 상태가 없다 — 링 스타일 존재 여부로만 판단
      const ring = rest ? rest !== window.__a11yStyle(el) : (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none'
      const name = (el.getAttribute('aria-label') || el.innerText || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 30)
      return { id: `${el.tagName}|${name}|${Math.round(r.x)},${Math.round(r.y + scrollY)}`, label: `${el.tagName.toLowerCase()} "${name}"`, ring }
    })
    if (!info) break
    // 네이티브 date input은 Tab이 연·월·일 칸 안에서 움직여 같은 요소가 연달아 잡힌다 — 그건 건너뛰고, 떨어져 있던 요소가 다시 오면 한 바퀴 돈 것
    if (info.id === prev) { if (++repeats > 5) break; continue }
    repeats = 0
    if (seen.has(info.id)) break
    prev = info.id
    seen.add(info.id)
    if (!info.ring) fail(`[tab] ${path} ${vp}: 포커스 링 없음 — ${info.label}`)
  }
}

async function checkPage(page, label, vp, scheme) {
  if (!skip.has('axe')) {
    const res = await runAxe(page)
    for (const v of res.violations) for (const n of v.nodes) fail(`[axe] ${label} ${vp}/${scheme}: ${describe(v, n)}`)
  }
  if (scheme === 'light' && !skip.has('tab')) await checkTabOrder(page, label, vp)
}

// 계좌 등록 위저드 2~4단계: 3단계부터는 브로커 연결 테스트(POST)를 통과해야 열린다.
// 그 POST만 page.route로 가짜 204를 돌려준다(page route가 context의 abort보다 먼저 잡는다). 마지막 "계좌 연결"(계좌 생성 POST)은 누르지 않는다
async function checkAccountWizard(page, vp, scheme) {
  await page.route('**/api/accounts/connection-tests', (route) => route.fulfill({ status: 204 }))
  try {
    await page.locator('button', { hasText: 'Client ID / Client Secret' }).click()
    await page.locator('#api-key').waitFor()
    await checkPage(page, `${WIZARD}#2`, vp, scheme)
    await page.locator('#api-key').fill('a11y-check-dummy-key')
    await page.locator('#api-secret').fill('a11y-check-dummy-secret')
    await page.getByRole('button', { name: '연결 테스트' }).click()
    await page.getByText('연결 성공').waitFor()
    await page.getByRole('button', { name: '다음' }).click()
    await page.locator('#account-no').waitFor()
    await checkPage(page, `${WIZARD}#3`, vp, scheme)
    await page.locator('#account-nickname').fill('a11y')
    await page.locator('#account-no').fill('13101001931')
    await page.getByRole('button', { name: '다음' }).click()
    await page.getByRole('button', { name: '계좌 연결' }).waitFor()
    await checkPage(page, `${WIZARD}#4`, vp, scheme)
  } catch (e) {
    fail(`[wizard] ${vp}/${scheme}: 진행 실패 — ${e.message.split('\n')[0]}`)
  } finally {
    await page.unroute('**/api/accounts/connection-tests')
  }
}

const dialogState = () => {
  const d = [...document.querySelectorAll('[role=dialog],[role=alertdialog]')].pop()
  if (!d) return { open: false }
  const lb = d.getAttribute('aria-labelledby')
  return {
    open: true,
    name: d.getAttribute('aria-label') || (lb && document.getElementById(lb)?.textContent?.trim()) || '',
    // base-ui Dialog는 aria-modal 대신 배경(main 포함)에 aria-hidden을 건다 — 둘 중 하나면 보조기기에 모달로 전달된다
    modal: d.getAttribute('aria-modal') === 'true' || !!document.querySelector('main')?.closest('[inert],[aria-hidden=true]'),
    inside: d.contains(document.activeElement),
  }
}

// 열린 다이얼로그 안에서 Tab·Shift+Tab을 돌며 밖으로 새는 횟수
async function trapEscapes(page, presses) {
  let escapes = 0
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let t = 0; t < presses; t++) {
      await page.keyboard.press(key)
      await page.waitForTimeout(TAB_WAIT_MS)
      if (!(await page.evaluate(dialogState)).inside) escapes++
    }
  }
  return escapes
}

// 공통 판정: 이름, aria-modal, 초기 포커스, 트랩, 모달 내부 axe, ESC 후 닫힘·트리거 복귀(요소 동일성)
async function assertDialog(page, label, trigger, presses) {
  const s = await page.evaluate(dialogState)
  if (!s.open) return fail(`${label}: 다이얼로그가 열리지 않음`)
  if (!s.name) fail(`${label}: 다이얼로그 이름 없음(aria-labelledby/aria-label)`)
  if (!s.modal) fail(`${label}: aria-modal 없음`)
  if (!s.inside) fail(`${label}: 초기 포커스가 다이얼로그 밖`)
  const escapes = await trapEscapes(page, presses)
  if (escapes) fail(`${label}: 포커스 트랩 이탈 ${escapes}회`)
  const ax = await runAxe(page, '[role=dialog],[role=alertdialog]')
  // region: 포털로 body 직속에 렌더되는 다이얼로그는 랜드마크 밖이 정상
  for (const v of ax.violations.filter((x) => x.id !== 'region')) for (const n of v.nodes) fail(`${label}: axe ${describe(v, n)}`)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(1500)
  if ((await page.evaluate(dialogState)).open) return fail(`${label}: ESC로 닫히지 않음`)
  if (!(await trigger.evaluate((el) => el === document.activeElement || el.contains(document.activeElement)))) {
    fail(`${label}: 닫은 뒤 포커스가 트리거로 돌아오지 않음 (현재 ${await page.evaluate(() => document.activeElement?.tagName)})`)
  }
}

async function checkDialogs(page, path) {
  const sel = '[data-slot=alert-dialog-trigger]:visible, [data-slot=dialog-trigger]:visible, [data-slot=sheet-trigger]:visible'
  const seen = new Set()
  const n = await page.locator(sel).count()
  for (let i = 0; i < n; i++) {
    const trigger = page.locator(sel).nth(i)
    const label = ((await trigger.getAttribute('aria-label')) || (await trigger.innerText()).trim()).slice(0, 20)
    if (seen.has(label)) continue
    seen.add(label)
    // 모달 트리거는 disabled 대신 aria-disabled를 쓴다(docs/agents/a11y.md) — 진짜 비활성 버튼만 건너뛴다
    if (await trigger.isDisabled()) continue
    await trigger.focus()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(700)
    await assertDialog(page, `[dialog] ${path} "${label}"`, trigger, 8)
    // 안 닫힌 다이얼로그가 배경을 가려 다음 트리거가 연쇄 오탐이 되지 않도록 다시 연다
    if ((await page.evaluate(dialogState)).open) await open(page, path)
  }
}

async function checkFormDialogs(page, vp, rows) {
  for (const { path: start, formDialog: [name, sel] } of rows) {
    await open(page, start)
    const link = page.locator(sel).first()
    if (!(await link.count())) { fail(`[modal] ${name} ${vp}: 트리거 없음(${sel}) — 시드 데이터 확인`); continue }
    await link.focus()
    await page.keyboard.press('Enter')
    await page.waitForSelector('[role=dialog]', { timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(1500)
    await assertDialog(page, `[modal] ${name} ${vp}`, link, 30)
  }
}

let browser
try {
  const tokens = { guest: undefined, user: await devToken('user'), admin: await devToken('admin') }
  const ctx = { seed, ...(await resolveContext(tokens.user)) }
  browser = await chromium.launch()
  for (const role of ['guest', 'user', 'admin']) {
    const rows = resolveRows(role, ctx)
    const picked = rows.filter((r) => !only || only.test(r.path)) // --only는 화면 점검에만 적용 — 폼 다이얼로그는 예전처럼 항상 돈다
    // 같은 경로(시드 키만 다른 행)는 한 번만 본다
    const pages = picked.filter((r, i) => picked.findIndex((x) => x.path === r.path) === i)
    // 상태 쿠키가 있는 화면(/pending·/rejected)은 다른 화면을 리다이렉트시키므로 쿠키별 컨텍스트로 나눈다
    const groups = Object.values(Object.groupBy(pages, (r) => JSON.stringify(r.cookies ?? {})))
    for (const vp of Object.keys(VIEWPORTS)) {
      for (const scheme of ['light', 'dark']) {
        if (skip.has('axe') && (skip.has('tab') || scheme === 'dark')) continue
        console.log(`== ${role} ${vp}/${scheme}`)
        for (const group of groups) {
          const ctxt = await newContext(browser, tokens[role], vp, scheme, group[0].cookies)
          const page = await ctxt.newPage()
          if (role === 'user') await stubSeedCash(page)
          for (const row of group) {
            await row.setup?.(page)
            await open(page, row.path)
            await checkPage(page, row.path, vp, scheme)
            if (row.path === WIZARD) await checkAccountWizard(page, vp, scheme)
          }
          await ctxt.close()
        }
      }
    }
    if (role === 'guest') continue
    const dctx = await newContext(browser, tokens[role], 'pc', 'light')
    const page = await dctx.newPage()
    if (!skip.has('dialog')) {
      console.log(`== ${role} dialogs`)
      for (const { path } of picked.filter((r) => r.dialogs)) { await open(page, path); await checkDialogs(page, path) }
    }
    await dctx.close()
    const formRows = rows.filter((r) => r.formDialog)
    if (role === 'user' && !skip.has('modal')) {
      for (const vp of Object.keys(VIEWPORTS)) {
        console.log(`== form dialogs ${vp}`)
        const mctx = await newContext(browser, tokens.user, vp, 'light')
        await checkFormDialogs(await mctx.newPage(), vp, formRows)
        await mctx.close()
      }
    }
  }
  if (skipped.length) console.log(`\n== 건너뜀(시드·데이터 없음) ${skipped.length}건: ${[...new Set(skipped)].join(', ')}`)
} catch (e) {
  failures.push(`중단: ${e.message}`)
  console.error(`\n중단: ${e.message}`)
} finally {
  await browser?.close()
}
console.log(`\n== 위반 ${failures.length}건`)
process.exit(failures.length ? 1 : 0)
