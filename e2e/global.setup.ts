import { mkdirSync, writeFileSync } from 'fs'
import { test as setup, expect } from '@playwright/test'

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:8080'
const TRADING_API_BASE = process.env.E2E_TRADING_API_BASE ?? 'http://localhost:8081'

// kista-api DevAuthController(local 프로파일 전용)에서 JWT를 받아
// kista-token 쿠키만 담긴 storageState를 만든다. proxy가 첫 요청에서 /me로 검증한다.
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

  for (const [endpoint, file] of [
    ['dev-token', 'user.json'],
    ['dev-token', 'account-cache.json'],
    ['dev-admin-token', 'admin.json'],
  ] as const) {
    const res = await request.post(`${API_BASE}/api/auth/${endpoint}`)
    expect(res.ok(), `${endpoint} 발급 실패 — 로컬 kista-api(local 프로파일)가 :8080에 떠 있는지 확인`).toBe(true)
    const { accessToken } = (await res.json()) as { accessToken: string }
    writeFileSync(`e2e/.auth/${file}`, JSON.stringify(storageState(accessToken)))
  }
})
