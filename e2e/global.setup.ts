import { mkdirSync, writeFileSync } from 'fs'
import { test as setup, expect } from '@playwright/test'

const TRADING_API_BASE = process.env.E2E_TRADING_API_BASE ?? 'http://localhost:8081'

// dev 토큰(kista-api local 프로파일 전용)으로 kista-token 쿠키만 담긴 storageState를 만든다. proxy가 첫 요청에서 /me로 검증한다.
function storageState(accessToken: string) {
  return {
    cookies: [
      {
        name: 'kista-token',
        value: accessToken,
        domain: 'localhost',
        path: '/',
        expires: -1,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax' as const,
      },
    ],
    origins: [],
  }
}

setup('dev 토큰으로 격리된 E2E storageState 생성', async ({ request }) => {
  const trading = await request.get(`${TRADING_API_BASE}/actuator/health`).catch(() => null)
  expect(trading?.ok(), 'kista-trading 헬스체크 실패 — 로컬 kista-trading이 :8081에 떠 있는지 확인').toBe(true)

  mkdirSync('e2e/.auth', { recursive: true })
  // 정적 import하면 같은 워커에서 seed.mjs가 browser.mjs를 ESM으로 다시 읽을 때 export를 못 찾는다(playwright의 .mjs 변환 캐시)
  const { devToken } = await import('../scripts/shared/browser.mjs')

  for (const [role, file] of [
    ['user', 'user.json'],
    ['e2e', 'account-cache.json'], // dev 시드가 없는 빈 사용자(...0003)
    ['admin', 'admin.json'],
  ] as const) {
    writeFileSync(`e2e/.auth/${file}`, JSON.stringify(storageState(await devToken(role))))
  }
})
