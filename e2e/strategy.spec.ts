import { test, expect } from '@playwright/test'

// 실제 kista-api 응답 → 정규화 → 렌더 경로 스모크. dev 시드 데이터에 의존하므로 특정 전략·금액은 단언하지 않는다.
// 원장 부족 배지·재주문 한도 같은 분기는 컴포넌트 단위 테스트가 맡는다
test.describe('전략 (USER)', () => {
  test.use({ storageState: 'e2e/.auth/user.json' })

  test('전략 목록 카드에 시작 예수금이 표시된다', async ({ page }) => {
    await page.goto('/strategies')
    await expect(page.getByRole('heading', { name: '전략 목록' })).toBeVisible()
    await expect(page.locator('a[href*="/strategies/"]').filter({ visible: true }).first()).toBeVisible()
    // 카드는 모바일·PC 레이아웃을 둘 다 마운트하고 하나를 숨긴다 — 보이는 쪽만 본다
    await expect(page.getByText('시작 예수금').filter({ visible: true }).first()).toBeVisible()
  })

  test('전략 등록 폼은 예수금을 직접 입력받는다', async ({ page }) => {
    await page.goto('/strategies')
    const href = await page.locator('a[href^="/accounts/"][href*="/strategies/"]').first().getAttribute('href')
    const accountId = href?.split('/')[2]
    expect(accountId).toBeTruthy()

    await page.goto(`/accounts/${accountId}/strategies/new`)
    await expect(page.getByRole('heading', { name: '전략 등록' })).toBeVisible()
    await expect(page.getByLabel('예수금 (USD)')).toBeEditable()
  })

  test('설정 화면에 잔고검증 항목이 없다', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: '계정 설정' })).toBeVisible()
    await expect(page.getByText(/잔고 ?검증/)).toHaveCount(0)
  })
})
