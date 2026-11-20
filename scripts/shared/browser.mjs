// a11y-check·visual-diff·e2e setup이 함께 쓰는 로컬 브라우저 준비 코드: dev 토큰 발급, 쿠키 주입 컨텍스트, 뷰포트
// 이 파일은 import가 없다 — e2e/global.setup.ts(TS)도 가져다 쓴다

export const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:8080'
export const TRADING_API_BASE = process.env.E2E_TRADING_API_BASE ?? 'http://localhost:8081'
export const VIEWPORTS = { pc: { width: 1440, height: 900 }, mo: { width: 390, height: 844 } }

const ENDPOINT = { user: 'dev-token', admin: 'dev-admin-token', e2e: 'dev-e2e-token' } // local 프로파일 전용. e2e = 시드 없는 빈 사용자

/**
 * dev 토큰 발급(쓰기성 호출은 이것 하나뿐 — 8080에 직접 POST). 실패하면 throw.
 * @param {'user' | 'admin' | 'e2e'} role
 * @param {{ timeout?: number }} [options] 응답 대기 상한(ms)
 * @returns {Promise<string>}
 */
export async function devToken(role, { timeout } = {}) {
  const r = await fetch(`${API_BASE}/api/auth/${ENDPOINT[role]}`, { method: 'POST', signal: timeout ? AbortSignal.timeout(timeout) : undefined }).catch(() => null)
  if (!r?.ok) throw new Error(`${role} 토큰 발급 실패(${r?.status ?? '응답 없음'}) — kista-api(${API_BASE})가 local 프로파일로 떠 있는지 확인. 이 도구는 백엔드를 기동하지 않는다`)
  return (await r.json()).accessToken
}

/**
 * kista-token(+추가 쿠키)을 심은 컨텍스트. 비회원은 token을 생략한다.
 * 컨텍스트 옵션은 그대로 넘어간다 — 호출자가 현재 값을 유지해야 픽셀이 안 바뀐다(visual-diff).
 * readOnly에 서버 주소를 주면 브라우저에서 나가는 GET/HEAD 외 요청을 전부 abort한다(a11y-check — 로컬 DB 실데이터 보호).
 * @param {import('@playwright/test').Browser} browser
 * @param {{ token?: string, cookies?: Record<string, string>, host?: string, readOnly?: string } & import('@playwright/test').BrowserContextOptions} options
 */
export async function authedContext(browser, { token, cookies = {}, host = 'localhost', readOnly, ...options }) {
  const ctx = await browser.newContext({ locale: 'ko-KR', timezoneId: 'Asia/Seoul', reducedMotion: 'reduce', ...options })
  const all = { ...(token && { 'kista-token': token }), ...cookies }
  const list = Object.entries(all).map(([name, value]) => ({ name, value, domain: host, path: '/', httpOnly: true, sameSite: 'Lax' }))
  if (list.length) await ctx.addCookies(list)
  if (readOnly) {
    await ctx.route('**/*', (route) => {
      const req = route.request()
      if (req.method() === 'GET' || req.method() === 'HEAD') return route.continue()
      // HMR·클라이언트 에러 리포트 같은 개발용 요청은 조용히 막는다
      if (!/\/_next\/|__nextjs|client-errors/.test(req.url())) console.log(`  · blocked ${req.method()} ${req.url().replace(readOnly, '')}`)
      return route.abort()
    })
  }
  return ctx
}
