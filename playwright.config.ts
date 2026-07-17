import { defineConfig } from '@playwright/test'

// E2E 전제: 로컬 kista-api(local 프로파일, :8080) 실행 필수 — dev 토큰 발급에 사용.
// dev 서버(:3000)는 webServer가 자동 기동하며, 이미 떠 있으면 재사용한다.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    browserName: 'chromium',
  },
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    { name: 'chromium', dependencies: ['setup'], testIgnore: /global\.setup\.ts/ },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
