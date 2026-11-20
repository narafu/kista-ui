import { defineConfig } from '@playwright/test'

// E2E 전제: 로컬 kista-api(local 프로파일, :8080) 실행 필수 — dev 토큰 발급에 사용.
// 매매 경로(trading)까지 쓰려면 kista-api를 KISTA_ROLE=all로 띄운다 — E2E_TRADING_API_BASE 기본값도 같은 :8080이다.
// 다른 worktree의 dev 서버를 재사용하지 않도록 전용 포트에서 항상 새로 기동한다.
const e2ePort = Number(process.env.E2E_PORT ?? 3100)
const apiBase = process.env.E2E_API_BASE ?? 'http://localhost:8080'
const tradingApiBase = process.env.E2E_TRADING_API_BASE ?? 'http://localhost:8080'

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${e2ePort}`,
    browserName: 'chromium',
  },
  projects: [
    { name: 'setup', testMatch: 'e2e/global.setup.ts' },
    {
      name: 'account-cache',
      dependencies: ['setup'],
      fullyParallel: false,
      testMatch: 'e2e/account-cache-consistency.spec.ts',
    },
    {
      name: 'chromium',
      dependencies: ['account-cache'],
      testMatch: 'e2e/**/*.spec.ts',
      testIgnore: 'e2e/account-cache-consistency.spec.ts',
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${e2ePort}`,
    env: { API_BASE_URL: apiBase, TRADING_API_BASE_URL: tradingApiBase },
    url: `http://localhost:${e2ePort}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
