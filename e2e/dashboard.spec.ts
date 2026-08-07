import { test, expect } from '@playwright/test'

test.describe('대시보드 (USER)', () => {
  test.use({ storageState: 'e2e/.auth/user.json' })

  test('인증된 사용자는 대시보드가 렌더링된다', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible()
  })
})

test.describe('대시보드 (비회원)', () => {
  test('비회원은 로그인 유도 없이 대시보드 빈 상태가 렌더링된다', async ({ browser }) => {
    const context = await browser.newContext() // storageState 없음
    const page = await context.newPage()
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText('첫 계좌 등록')).toBeVisible()
    await context.close()
  })
})
