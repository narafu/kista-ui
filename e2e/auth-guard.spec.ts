import { test, expect } from '@playwright/test'

test.describe('proxy 인증 가드', () => {
  test('비인증 사용자의 /dashboard 접근은 허용된다 (비보호 경로)', async ({ browser }) => {
    const context = await browser.newContext() // storageState 없음
    const page = await context.newPage()
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/dashboard')
    await context.close()
  })

  test('비인증 사용자의 /accounts 접근은 /login으로 리다이렉트된다', async ({ browser }) => {
    const context = await browser.newContext() // storageState 없음
    const page = await context.newPage()
    await page.goto('/accounts')
    await expect(page).toHaveURL('/login')
    await context.close()
  })

  test('비인증 사용자가 "/" 방문 시 /dashboard로 리다이렉트된다', async ({ browser }) => {
    const context = await browser.newContext() // storageState 없음
    const page = await context.newPage()
    await page.goto('/')
    await expect(page).toHaveURL('/dashboard')
    await context.close()
  })

  test('USER role의 /admin 접근은 /dashboard로 리다이렉트된다', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'e2e/.auth/user.json' })
    const page = await context.newPage()
    await page.goto('/admin')
    await expect(page).toHaveURL('/dashboard')
    await context.close()
  })
})
