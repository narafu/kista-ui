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
    await expect.poll(() => createBody?.initialUsdDeposit).toBe(8000)
  })
})

test.describe('관리자 재주문 원장 한도 (ADMIN)', () => {
  test.use({ storageState: 'e2e/.auth/admin.json' })

  const account = { id: 'e2e-account', userId: 'e2e-user', ownerNickname: 'e2e 사용자', accountNoMasked: '999-99****', broker: 'KIS', strategies: [] }
  const strategy = { id: 'e2e-strategy', type: 'INFINITE', status: 'ACTIVE', ticker: 'TSLA', cycleSeedType: 'NONE' }
  // 원본 BUY 2주 × $100. 남은 원장 $50 + 원본 환급 $200 = 가용 $250. 폼은 tradeDate를 읽지 않는다(표시용 값)
  const order = {
    id: 'e2e-order', userId: 'e2e-user', accountId: 'e2e-account', strategyId: 'e2e-strategy', strategyCycleId: 'e2e-cycle',
    ownerNickname: 'e2e 사용자', strategyType: 'INFINITE', tradeDate: '2026-10-26', ticker: 'TSLA', direction: 'BUY',
    orderType: 'LOC', timing: 'AT_CLOSE', quantity: 2, price: 100, status: 'PLACED', externalOrderId: 'ext-e2e',
  }

  test('사이클 원장 한도를 넘는 BUY 재주문은 제출이 막힌다', async ({ page }) => {
    await page.route((url) => url.pathname === '/api/admin/accounts', (route) => route.fulfill({ json: [account] }))
    await page.route('**/api/admin/accounts/e2e-account/strategies', (route) => route.fulfill({ json: [strategy] }))
    await page.route('**/api/admin/accounts/e2e-account/strategies/e2e-strategy/orders**', (route) => route.fulfill({ json: [order] }))
    await page.route('**/api/admin/trades/reorder-timing', (route) => route.fulfill({ json: { atOpen: false, atClose: true, immediate: false } }))
    await page.route('**/api/admin/trades/reorder-buy-budget**', (route) =>
      route.fulfill({ json: { cycleRemaining: { 'e2e-cycle': 50 }, sourceRefunds: { 'e2e-order': 200 } } }))
    let reorderCalls = 0
    await page.route('**/api/admin/trades/reorders', (route) => {
      reorderCalls += 1
      return route.fulfill({ status: 500, json: { detail: 'e2e: 재주문 요청 차단' } })
    })

    await page.goto('/admin/trades')
    for (const [name, option] of [['사용자 선택', 'e2e 사용자'], ['증권사 선택', /한국투자/], ['계좌 선택', '999-99****'], ['전략 선택', /TSLA/]] as const) {
      await page.getByRole('combobox', { name }).click()
      await page.getByRole('option', { name: option }).click()
    }

    const quantity = page.getByLabel('주문 1 재주문 수량')
    const submit = page.getByRole('button', { name: '변경한 주문 1건 재주문' })
    await expect(page.getByText(/남은 원장 한도/)).toBeVisible()

    // 2주 × $120 = $240 ≤ $250 — 제출 가능
    await page.getByLabel('주문 1 재주문 가격').fill('120')
    await expect(submit).toBeEnabled()

    // 3주 × $120 = $360 > $250 — $110 초과, 제출 차단
    await quantity.fill('3')
    await expect(page.getByText(/남은 원장 한도를 \$110\.00 초과합니다/)).toBeVisible()
    await expect(submit).toBeDisabled()
    expect(reorderCalls).toBe(0)
  })
})
