import { test, expect } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

test.describe('대시보드 (USER)', () => {
  test('인증된 사용자는 대시보드가 렌더링된다', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible()
  })
})
