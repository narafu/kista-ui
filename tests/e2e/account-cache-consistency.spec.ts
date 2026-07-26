import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page, TestInfo } from '@playwright/test'

type TestAccount = {
  id: string
  nickname: string
}

async function listAccounts(request: APIRequestContext): Promise<TestAccount[]> {
  const response = await request.get('/api/accounts')
  expect(response.ok(), `계좌 목록 준비 실패: ${response.status()} ${await response.text()}`).toBe(true)
  return response.json() as Promise<TestAccount[]>
}

async function resetDedicatedTestUser(request: APIRequestContext) {
  const accounts = await listAccounts(request)
  for (const account of accounts) {
    const response = await request.delete(`/api/accounts/${account.id}`)
    expect(response.ok(), `테스트 계좌 정리 실패 (${account.nickname}): ${response.status()}`).toBe(true)
  }
}

async function createMockAccount(request: APIRequestContext, nickname: string) {
  const response = await request.post('/api/accounts', {
    data: { broker: 'MOCK', nickname },
  })
  expect(response.status(), `MOCK 계좌 준비 실패: ${await response.text()}`).toBe(201)
}

async function createMockAccountThroughUi(page: Page, nickname: string) {
  await page.getByRole('button', { name: '계좌 등록하기', exact: true }).click()
  await page.getByRole('button', { name: /모의계좌/ }).click()
  await page.getByLabel('계좌 별칭').fill(nickname)
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await page.getByRole('button', { name: '계좌 연결', exact: true }).click()
  await expect(page).toHaveURL(/\/accounts\/[^/]+$/)
}

function accountCard(page: Page, nickname: string) {
  return page.getByRole('link').filter({ hasText: nickname })
}

async function deleteAccountThroughUi(page: Page, nickname: string) {
  await accountCard(page, nickname).click()
  await page.getByRole('link', { name: '계좌 수정' }).click()
  await page.getByRole('button', { name: '계좌 삭제', exact: true }).click()
  await page.getByPlaceholder(nickname).fill(nickname)
  await page.getByRole('button', { name: '영구 삭제' }).click()
  await expect(page).toHaveURL('/accounts')
}

function uniqueAccountName(prefix: string, testInfo: TestInfo) {
  return `${prefix}-${testInfo.workerIndex}-${Date.now()}`
}

test.use({ storageState: 'e2e/.auth/user.json' })

test.describe('계좌 Router Cache 일관성', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ request }) => {
    await resetDedicatedTestUser(request)
  })

  test.afterEach(async ({ request }) => {
    await resetDedicatedTestUser(request)
  })

  test('created account removes first-account dashboard state without reload', async ({ page }, testInfo) => {
    const nickname = uniqueAccountName('cache-create', testInfo)

    await page.goto('/dashboard')
    await expect(page.getByText('첫 계좌 등록', { exact: true })).toBeVisible()

    await createMockAccountThroughUi(page, nickname)
    await page.getByRole('link', { name: '대시보드', exact: true }).click()

    await expect(page.getByText('첫 계좌 등록', { exact: true })).not.toBeVisible()
  })

  test('deleted account disappears from account list without reload', async ({ page, request }, testInfo) => {
    const nickname = uniqueAccountName('cache-delete', testInfo)
    await createMockAccount(request, nickname)

    await page.goto('/accounts')
    await expect(accountCard(page, nickname)).toBeVisible()

    await deleteAccountThroughUi(page, nickname)

    await expect(accountCard(page, nickname)).not.toBeVisible()
  })
})
