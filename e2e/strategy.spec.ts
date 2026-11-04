import { test, expect } from '@playwright/test'

// 실제 kista-api 응답 → 정규화 → 렌더 경로 스모크. dev 시드 데이터에 의존하므로 특정 전략·금액은 단언하지 않는다.
// 원장 부족 배지 같은 분기는 컴포넌트 단위 테스트가 맡는다
test.describe('전략 (USER)', () => {
  test.use({ storageState: 'e2e/.auth/user.json' })

  test('전략 목록에 전략 카드가 표시된다', async ({ page }) => {
    await page.goto('/strategies')
    await expect(page.getByRole('heading', { name: '전략 목록' })).toBeVisible()
    // 카드는 모바일·PC 레이아웃을 둘 다 마운트하고 하나를 숨긴다 — 보이는 쪽만 본다
    await expect(page.locator('a[href*="/strategies/"]').filter({ visible: true }).first()).toBeVisible()
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

  test('투자금 추가 폼은 입력칸별 오류를 보이고 확인 다이얼로그에서 취소할 수 있다', async ({ page }) => {
    // 실제 데이터가 있는 로컬 DB라 최종 "추가 확정"은 절대 누르지 않는다
    const { seed } = await import('../scripts/shared/seed.mjs')
    await page.goto(`/accounts/${seed.infinite.accountId}/strategies/${seed.infinite.strategyId}`)
    await page.getByRole('link', { name: '투자금 추가' }).click()
    await expect(page.getByRole('heading', { name: '투자금 추가' })).toBeVisible()

    const empty = '추가할 예수금이나 편입할 주식을 입력하세요.'
    await page.getByRole('button', { name: '추가', exact: true }).click()
    await expect(page.getByText(empty)).toBeVisible()

    await page.getByLabel('편입 주식 수').fill('10')
    await expect(page.getByText(empty)).toHaveCount(0)
    await expect(page.getByText('주식을 편입하려면 매수단가를 입력하세요.')).toBeVisible()

    await page.getByLabel('매수단가').fill('62.5')
    await page.getByRole('button', { name: '추가', exact: true }).click()
    await expect(page.getByText('투자금을 추가하시겠습니까?')).toBeVisible()
    await page.getByRole('button', { name: '취소' }).click()
    await expect(page.getByText('투자금을 추가하시겠습니까?')).toHaveCount(0)
  })

  test('투자금 인출 폼은 칸 아래에 오류를 보이고 확인 다이얼로그에서 취소할 수 있다', async ({ page }) => {
    // 실제 데이터가 있는 로컬 DB라 최종 "인출 확정"은 절대 누르지 않는다
    const { seed } = await import('../scripts/shared/seed.mjs')
    await page.goto(`/accounts/${seed.infinite.accountId}/strategies/${seed.infinite.strategyId}`)
    await page.getByRole('link', { name: '투자금 인출' }).click()
    await expect(page.getByRole('heading', { name: '투자금 인출' })).toBeVisible()

    await page.getByRole('button', { name: '인출', exact: true }).click()
    await expect(page.getByText('인출할 예수금을 입력하세요.')).toBeVisible()

    await page.getByLabel('인출 예수금').fill('0.01')
    await page.getByRole('button', { name: '인출', exact: true }).click()
    await expect(page.getByText('투자금을 인출하시겠습니까?')).toBeVisible()
    await page.getByRole('button', { name: '취소' }).click()
    await expect(page.getByText('투자금을 인출하시겠습니까?')).toHaveCount(0)
  })

  test('VR 전략 상세에는 투자금 추가 링크가 없다', async ({ page }) => {
    const { seed } = await import('../scripts/shared/seed.mjs')
    await page.goto(`/accounts/${seed.vr.accountId}/strategies/${seed.vr.strategyId}`)
    await expect(page.getByRole('link', { name: 'VR 재설정' })).toBeVisible()
    await expect(page.getByRole('link', { name: '투자금 추가' })).toHaveCount(0)
    await expect(page.getByRole('link', { name: '투자금 인출' })).toHaveCount(0)
  })
})
