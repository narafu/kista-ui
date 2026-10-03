// 시나리오마다 head/base를 같은 조건으로 fullPage 촬영하고 픽셀 비교한다
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'
// sharp는 next의 전이 의존성으로 설치돼 있다 — 별도 devDependency로 추가하지 않음
import sharp from 'sharp'

const VIEWPORTS = { pc: { width: 1440, height: 900 }, mo: { width: 390, height: 844 } }
// 월요일 10:00 KST — 주말에 돌리면 휴장일 배너가 부족 배너를 가린다. 시계 고정 시 양쪽에 hydration 에러가 나는 건 정상
const WEEKDAY = new Date('2026-10-05T01:00:00Z')
const SETTLE_MS = 4000
const PIXEL_THRESHOLD = 30

async function capture(browser, { url, token, viewport, scenario, file }) {
  const ctx = await browser.newContext({ viewport, locale: 'ko-KR', timezoneId: 'Asia/Seoul', reducedMotion: 'reduce' })
  await ctx.addCookies([{ name: 'kista-token', value: token, domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }])
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)) })
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e).slice(0, 300)))
  if (scenario.clock) await page.clock.setFixedTime(WEEKDAY)
  let status
  try {
    // SSE 때문에 networkidle은 타임아웃 난다 — load + 고정 대기
    const r = await page.goto(url, { waitUntil: 'load', timeout: 60000 })
    status = r?.status()
    await page.waitForTimeout(SETTLE_MS)
    for (const step of scenario.steps ?? []) await step(page)
    await page.waitForTimeout(500)
  } catch (e) { errs.push('NAV ' + String(e).slice(0, 200)) }
  // Next dev 표시 배지("N"·"1 Issue")는 에러 유무·애니메이션에 따라 달라져 가짜 diff를 만든다 — 에러는 errs로 따로 비교한다
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important }' }).catch(() => {})
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled', caret: 'hide' }).catch((e) => errs.push('SHOT ' + e))
  const finalUrl = new URL(page.url()).pathname
  await ctx.close()
  return { file, status, url: finalUrl, errs }
}

async function diffPixels(fileA, fileB) {
  try {
    const [a, b] = await Promise.all([fileA, fileB].map((f) => sharp(f).raw().toBuffer({ resolveWithObject: true })))
    if (a.info.width !== b.info.width || a.info.height !== b.info.height) {
      return `SIZE ${a.info.width}x${a.info.height} vs ${b.info.width}x${b.info.height}`
    }
    let n = 0
    const c = a.info.channels
    for (let i = 0; i < a.data.length; i += c) {
      if (Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]) > PIXEL_THRESHOLD) n++
    }
    return n
  } catch (e) {
    return 'ERR ' + e
  }
}

// servers: { head: port, base: port }, tokens: { user, admin }
export async function shoot({ scenarios, servers, tokens, outDir, setMode, log }) {
  const browser = await chromium.launch()
  const report = []
  try {
    for (const scenario of scenarios) {
      setMode(scenario.mode ?? 'real')
      for (const [vp, viewport] of Object.entries(VIEWPORTS)) {
        // head/base는 같은 모드라 병렬로 찍는다. 시나리오·뷰포트 간 병렬은 하지 않는다 — 모드(setMode)가 전역이고,
        // 동시 촬영이 늘수록 두 dev 서버의 lazy 컴파일이 겹쳐 고정 SETTLE_MS 안에 안 그려질 위험이 커진다
        const shots = Object.fromEntries(await Promise.all(Object.entries(servers).map(async ([label, port]) => {
          mkdirSync(`${outDir}/${label}`, { recursive: true })
          return [label, await capture(browser, {
            url: `http://localhost:${port}${scenario.path}`,
            token: scenario.admin ? tokens.admin : tokens.user,
            viewport, scenario,
            file: `${outDir}/${label}/${scenario.name}-${vp}.png`,
          })]
        })))
        const diff = await diffPixels(shots.head.file, shots.base.file)
        const newErrs = shots.head.errs.filter((e) => !shots.base.errs.includes(e))
        const line = { name: scenario.name, vp, diff, head: shots.head, base: shots.base, newErrs }
        report.push(line)
        log(`${diff === 0 ? 'same' : 'DIFF'} ${scenario.name} ${vp} diff=${diff} status=${shots.head.status}/${shots.base.status} url=${shots.head.url}${newErrs.length ? ` newErrs=${newErrs.length}` : ''}`)
      }
    }
  } finally {
    await browser.close()
  }
  return report
}
