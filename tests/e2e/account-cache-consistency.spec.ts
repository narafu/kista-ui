import { expect, test } from '@playwright/test'
import type { APIRequestContext, Page, Request, TestInfo } from '@playwright/test'

import {
  ACCOUNT_CACHE_PREFIX,
  ACCOUNT_CACHE_USER_ID,
  accountCleanupCandidates,
  assertAccountCacheOwnership,
  assertNoForeignAccounts,
} from './support/account-cache-fixture'

type TestAccount = {
  id: string
  nickname: string
}

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:8080'
const createdAccountIds = new Set<string>()

async function listAccounts(request: APIRequestContext): Promise<TestAccount[]> {
  const response = await request.get('/api/accounts')
  expect(response.ok(), `계좌 목록 준비 실패: ${response.status()} ${await response.text()}`).toBe(true)
  return response.json() as Promise<TestAccount[]>
}

async function verifyAccountCacheIdentity(request: APIRequestContext) {
  const response = await request.get('/api/auth/me')
  expect(response.ok(), `E2E 사용자 확인 실패: ${response.status()} ${await response.text()}`).toBe(true)
  const user = await response.json() as { id: string }
  assertAccountCacheOwnership(API_BASE, user.id)
  expect(user.id).toBe(ACCOUNT_CACHE_USER_ID)
}

async function cleanupOwnedAccounts(request: APIRequestContext) {
  await verifyAccountCacheIdentity(request)
  const accounts = await listAccounts(request)
  const cleanupAccounts = accountCleanupCandidates(accounts, createdAccountIds)

  for (const account of cleanupAccounts) {
    const response = await request.delete(`/api/accounts/${account.id}`)
    expect(response.ok(), `테스트 계좌 정리 실패 (${account.nickname}): ${response.status()}`).toBe(true)
  }
  createdAccountIds.clear()
}

async function prepareFirstAccountState(request: APIRequestContext) {
  await cleanupOwnedAccounts(request)
  assertNoForeignAccounts(await listAccounts(request))
}

async function createMockAccount(request: APIRequestContext, nickname: string) {
  const response = await request.post('/api/accounts', {
    data: { broker: 'MOCK', nickname },
  })
  expect(response.status(), `MOCK 계좌 준비 실패: ${await response.text()}`).toBe(201)
  const account = await response.json() as TestAccount
  createdAccountIds.add(account.id)
}

async function createMockAccountThroughUi(page: Page, nickname: string) {
  await page.getByRole('button', { name: '계좌 등록하기', exact: true }).click()
  await page.getByRole('button', { name: /모의계좌/ }).click()
  await page.getByLabel('계좌 별칭').fill(nickname)
  await page.getByRole('button', { name: '다음', exact: true }).click()
  await page.getByRole('button', { name: '계좌 연결', exact: true }).click()
  await expect(page).toHaveURL(/\/accounts\/[^/]+$/)
  createdAccountIds.add(new URL(page.url()).pathname.split('/')[2])
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
  return `${ACCOUNT_CACHE_PREFIX}${prefix}-${testInfo.workerIndex}-${Date.now()}`
}

async function installSpaNavigationOracle(page: Page) {
  const sentinel = `spa-${Date.now()}-${Math.random()}`
  const documentNavigations: string[] = []
  const trackDocumentNavigation = (request: Request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      documentNavigations.push(request.url())
    }
  }

  page.on('request', trackDocumentNavigation)
  await page.evaluate((value) => {
    (window as Window & { __accountCacheSpaSentinel?: string }).__accountCacheSpaSentinel = value
  }, sentinel)

  return {
    async expectSurvived() {
      expect(documentNavigations, 'client navigation triggered a main-frame document request').toEqual([])
      await expect.poll(() => page.evaluate(() =>
        (window as Window & { __accountCacheSpaSentinel?: string }).__accountCacheSpaSentinel,
      )).toBe(sentinel)
    },
    dispose() {
      page.off('request', trackDocumentNavigation)
    },
  }
}

test.use({ storageState: 'e2e/.auth/account-cache.json' })

test.describe('계좌 Router Cache 일관성', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ request }) => {
    await prepareFirstAccountState(request)
  })

  test.afterEach(async ({ request }) => {
    await cleanupOwnedAccounts(request)
  })

  test('created account removes first-account dashboard state without reload', async ({ page }, testInfo) => {
    const nickname = uniqueAccountName('cache-create', testInfo)

    await page.goto('/dashboard')
    await expect(page.getByText('첫 계좌 등록', { exact: true })).toBeVisible()
    const navigation = await installSpaNavigationOracle(page)

    await createMockAccountThroughUi(page, nickname)
    await page.getByRole('link', { name: '대시보드', exact: true }).click()

    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByRole('heading', { name: '대시보드' })).toBeVisible()
    await expect(page.getByText('첫 계좌 등록', { exact: true })).not.toBeVisible()
    await navigation.expectSurvived()
    navigation.dispose()
  })

  test('deleted account disappears from account list without reload', async ({ page, request }, testInfo) => {
    const nickname = uniqueAccountName('cache-delete', testInfo)
    await createMockAccount(request, nickname)

    await page.goto('/accounts')
    await expect(accountCard(page, nickname)).toBeVisible()
    const navigation = await installSpaNavigationOracle(page)

    await deleteAccountThroughUi(page, nickname)

    await expect(page).toHaveURL('/accounts')
    await expect(page.getByRole('heading', { name: '내 계좌' })).toBeVisible()
    await expect(page.getByText('등록된 계좌가 없습니다', { exact: true })).toBeVisible()
    await expect(accountCard(page, nickname)).not.toBeVisible()
    await navigation.expectSurvived()
    navigation.dispose()
  })
})
