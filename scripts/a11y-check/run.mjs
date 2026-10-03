// 접근성 회귀 점검: axe(PC·모바일 × 라이트·다크), 키보드 포커스 링, 다이얼로그·라우트 모달 포커스 관리.
// 위반이 하나라도 있으면 exit 1. 사용법·전제·제외 규칙 근거는 같은 디렉토리 README.md
// 안전장치: 이미 떠 있는 dev 서버(--url)를 읽기만 한다 — 브라우저에서 나가는 GET/HEAD 외 요청은 전부 abort(로컬 DB 실데이터 보호)
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { parseArgs } from 'node:util'
import { chromium } from '@playwright/test'
import { seed } from '../visual-diff/seed.mjs'

// axe-core는 eslint-plugin-jsx-a11y의 전이 의존성으로 설치돼 있다 — 별도 devDependency로 추가하지 않음
const axeSrc = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')
const API = 'http://localhost:8080'
const VIEWPORTS = { pc: { width: 1440, height: 900 }, mo: { width: 390, height: 844 } }
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']
const SETTLE_MS = 2500
// base-ui 포커스 가드는 비동기로 포커스를 되돌린다 — Tab 직후 바로 읽으면 가드 요소를 잡는 오탐
const TAB_WAIT_MS = 150
const MAX_TABS = 80

const detail = ({ accountId, strategyId }) => `/accounts/${accountId}/strategies/${strategyId}`
const ACCT = `/accounts/${seed.infinite.accountId}`
const PAGES = {
  guest: ['/login', '/dashboard'],
  user: [
    '/dashboard', '/accounts', ACCT, detail(seed.infinite), detail(seed.vr),
    '/stats', '/stats/benchmark', '/stats/backtest',
    '/finance', '/finance/income', '/finance/expense', '/finance/saving', '/finance/settings', '/settings',
  ],
  admin: ['/admin', '/admin/users', '/admin/pending', '/admin/accounts', '/admin/trades', '/admin/privacy-trades', '/admin/logs', '/admin/settings'],
}
// 트리거([data-slot=*-trigger])로 여는 다이얼로그를 점검할 페이지
const DIALOG_PAGES = {
  user: ['/settings', '/finance/settings', ACCT, detail(seed.infinite), '/finance'],
  admin: ['/admin/users', '/admin/pending', '/admin/accounts', '/admin/privacy-trades', '/admin/settings', '/admin/logs'],
}
// 인터셉팅 라우트 모달(RouteModal): [이름, 시작 페이지, 링크 셀렉터]
const ROUTE_MODALS = [
  ['전략 수정', detail(seed.infinite), 'a[href$="/edit"]:visible'],
  ['자산 수정', '/finance', 'a[href^="/finance/"][href$="/edit"]:visible'],
  ['자산 복제', '/finance', 'a[href^="/finance/new"]:visible'],
]

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
const pick = (list) => list.filter((p) => !only || only.test(p))

const failures = []
const fail = (msg) => { failures.push(msg); console.log(`  ✗ ${msg}`) }

async function devToken(endpoint) {
  // dev 토큰 발급만 8080에 직접 POST. local 프로파일 전용 엔드포인트
  const r = await fetch(`${API}/api/auth/${endpoint}`, { method: 'POST' }).catch(() => null)
  if (!r?.ok) throw new Error(`${endpoint} 발급 실패 — kista-api(:8080)가 local 프로파일로 떠 있는지 확인. 이 도구는 백엔드를 기동하지 않는다`)
  return (await r.json()).accessToken
}

async function newContext(browser, token, vp, scheme) {
  const mobile = vp === 'mo'
  const ctx = await browser.newContext({ viewport: VIEWPORTS[vp], colorScheme: scheme, isMobile: mobile, hasTouch: mobile, locale: 'ko-KR', timezoneId: 'Asia/Seoul', reducedMotion: 'reduce' })
  if (token) await ctx.addCookies([{ name: 'kista-token', value: token, domain: new URL(BASE).hostname, path: '/', httpOnly: true, sameSite: 'Lax' }])
  await ctx.route('**/*', (route) => {
    const req = route.request()
    if (req.method() === 'GET' || req.method() === 'HEAD') return route.continue()
    // HMR·클라이언트 에러 리포트 같은 개발용 요청은 조용히 막는다
    if (!/\/_next\/|__nextjs|client-errors/.test(req.url())) console.log(`  · blocked ${req.method()} ${req.url().replace(BASE, '')}`)
    return route.abort()
  })
  return ctx
}

async function open(page, path) {
  await page.goto(BASE + path, { waitUntil: 'load', timeout: 90_000 })
  // SSE(/api/trades/stream) 때문에 networkidle에 도달하지 않는다 — load + 고정 대기
  await page.waitForTimeout(SETTLE_MS)
  const landed = new URL(page.url()).pathname
  if (landed !== path.split('?')[0]) fail(`${path} → ${landed}로 리다이렉트됨 (토큰·시드 데이터 확인)`)
}

async function runAxe(page, scope) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: axeSrc })
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
    const style = (el) => { const cs = getComputedStyle(el); return `${cs.outlineStyle}|${cs.outlineWidth}|${cs.outlineColor}|${cs.boxShadow}|${cs.borderColor}` }
    window.__a11yStyle = style
    window.__a11yRest = new WeakMap()
    for (const el of document.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex],[contenteditable]')) window.__a11yRest.set(el, style(el))
  })
  const seen = new Set()
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
    if (!info || seen.has(info.id)) break
    seen.add(info.id)
    if (!info.ring) fail(`[tab] ${path} ${vp}: 포커스 링 없음 — ${info.label}`)
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
    // 모달 트리거는 disabled 대신 aria-disabled를 쓴다(constraints.md) — 진짜 비활성 버튼만 건너뛴다
    if (await trigger.isDisabled()) continue
    await trigger.focus()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(700)
    await assertDialog(page, `[dialog] ${path} "${label}"`, trigger, 8)
    // 안 닫힌 다이얼로그가 배경을 가려 다음 트리거가 연쇄 오탐이 되지 않도록 다시 연다
    if ((await page.evaluate(dialogState)).open) await open(page, path)
  }
}

async function checkRouteModals(page, vp) {
  for (const [name, start, sel] of ROUTE_MODALS) {
    await open(page, start)
    const link = page.locator(sel).first()
    if (!(await link.count())) { fail(`[modal] ${name} ${vp}: 트리거 링크 없음(${sel}) — 시드 데이터 확인`); continue }
    await link.focus()
    await page.keyboard.press('Enter')
    await page.waitForSelector('[role=dialog]', { timeout: 60_000 }).catch(() => {})
    await page.waitForTimeout(1500)
    await assertDialog(page, `[modal] ${name} ${vp}`, link, 30)
  }
}

let browser
try {
  const tokens = { guest: null, user: await devToken('dev-token'), admin: await devToken('dev-admin-token') }
  browser = await chromium.launch()
  for (const role of ['guest', 'user', 'admin']) {
    const pages = pick(PAGES[role])
    for (const vp of Object.keys(VIEWPORTS)) {
      for (const scheme of ['light', 'dark']) {
        if (skip.has('axe') && (skip.has('tab') || scheme === 'dark')) continue
        console.log(`== ${role} ${vp}/${scheme}`)
        const ctx = await newContext(browser, tokens[role], vp, scheme)
        const page = await ctx.newPage()
        for (const path of pages) {
          await open(page, path)
          if (!skip.has('axe')) {
            const res = await runAxe(page)
            for (const v of res.violations) for (const n of v.nodes) fail(`[axe] ${path} ${vp}/${scheme}: ${describe(v, n)}`)
          }
          if (scheme === 'light' && !skip.has('tab')) await checkTabOrder(page, path, vp)
        }
        await ctx.close()
      }
    }
    if (role === 'guest') continue
    const ctx = await newContext(browser, tokens[role], 'pc', 'light')
    const page = await ctx.newPage()
    if (!skip.has('dialog')) {
      console.log(`== ${role} dialogs`)
      for (const path of pick(DIALOG_PAGES[role])) { await open(page, path); await checkDialogs(page, path) }
    }
    await ctx.close()
    if (role === 'user' && !skip.has('modal')) {
      for (const vp of Object.keys(VIEWPORTS)) {
        console.log(`== route modals ${vp}`)
        const mctx = await newContext(browser, tokens.user, vp, 'light')
        await checkRouteModals(await mctx.newPage(), vp)
        await mctx.close()
      }
    }
  }
} catch (e) {
  failures.push(`중단: ${e.message}`)
  console.error(`\n중단: ${e.message}`)
} finally {
  await browser?.close()
}
console.log(`\n== 위반 ${failures.length}건`)
process.exit(failures.length ? 1 : 0)
