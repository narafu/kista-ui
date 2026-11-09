import { test, expect } from '@playwright/test'

// 전략 원장 예산 분기 — 로컬 실데이터로는 만들 수 없는 값만 브라우저 요청을 page.route로 덮는다.
// 쓰기 요청도 브라우저 안에서 가로채 서버에 닿지 않는다(로컬 DB 실데이터 보호)

test.describe('시드 폼 가용 예수금 (USER)', () => {
  test.use({ storageState: 'e2e/.auth/user.json' })

  test('시드가 가용 예수금을 넘어도 경고만 띄우고 등록 요청은 보낸다', async ({ page }) => {
    // 크립토 계좌는 DCA 전용 폼이라 시드 입력이 없다 — 주식 계좌(MOCK·KIS)를 고른다
    const accounts: { id: string; broker: string }[] = await (await page.request.get('/api/accounts')).json()
    const accountId = accounts.find((a) => a.broker === 'MOCK' || a.broker === 'KIS')?.id
    expect(accountId, 'dev 시드에 MOCK·KIS 계좌가 있어야 한다').toBeTruthy()

    // 로컬 시드 미리보기는 availableCash가 항상 null이고 KIS 계좌는 503일 수 있다 — 응답 전체를 고정한다
    await page.route('**/api/accounts/*/strategy-seed-preview**', (route) =>
      route.fulfill({ json: { ticker: 'SOXL', basePrice: 80, minSeed: 3000, skipReason: null, availableCash: 5000 } }))
    let createBody: Record<string, unknown> | null = null
    await page.route('**/api/accounts/*/trading-cycles', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      createBody = route.request().postDataJSON()
      await route.fulfill({ status: 500, json: { detail: 'e2e: 등록 요청 차단' } })
    })

    await page.goto(`/accounts/${accountId}/strategies/new`)
    await expect(page.getByText('가용 예수금 $5,000.00')).toBeVisible()

    const seed = page.getByLabel('예수금 (USD)')
    await seed.fill('8000')
    await expect(page.getByText('추가 입금 필요')).toBeVisible()

    const submit = page.getByRole('button', { name: '등록', exact: true })
    await expect(submit).toBeEnabled()
    await submit.click()
    await expect.poll(() => createBody?.initialDeposit).toBe(8000)
  })
})
