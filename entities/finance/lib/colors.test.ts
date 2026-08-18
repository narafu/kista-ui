import { describe, expect, it } from 'vitest'
import { ASSET_L1_CATEGORY_IDS } from './aggregate'
import { assetCategoryColor, assetClassColor } from './colors'

describe('assetCategoryColor', () => {
  it('L1 카테고리 4개에 서로 다른 색을 배정한다', () => {
    const colors = new Set(ASSET_L1_CATEGORY_IDS.map(assetCategoryColor))
    expect(colors.size).toBe(4)
  })

  it('알 수 없는 카테고리 ID는 muted-foreground로 폴백한다', () => {
    expect(assetCategoryColor('unknown-category-id')).toBe('var(--muted-foreground)')
  })
})

describe('assetClassColor', () => {
  it('AssetClass 6종에 서로 다른 색을 배정한다', () => {
    const colors = new Set((['CASH', 'EQUITY', 'FIXED_INCOME', 'COMMODITY', 'CRYPTO', 'REAL_ESTATE'] as const).map(assetClassColor))
    expect(colors.size).toBe(6)
  })

  it('같은 자산군은 항상 같은 색을 반환한다', () => {
    expect(assetClassColor('EQUITY')).toBe(assetClassColor('EQUITY'))
  })
})
