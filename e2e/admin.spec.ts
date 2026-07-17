import { test, expect } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/admin.json' })

test.describe('관리자 (ADMIN)', () => {
  test('ADMIN은 /admin 개요에 접근할 수 있다', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL('/admin')
    await expect(page.getByRole('heading', { name: '개요' })).toBeVisible()
  })

  test('사용자 목록 테이블이 렌더링된다', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page.getByRole('table')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: '닉네임' })).toBeVisible()
  })
})
