import { describe, expect, it } from 'vitest'
import type { Asset } from '../model/types'
import { assetCategoryColor, assetClassColorMap } from './colors'

let nextId = 1
function asset(overrides: Partial<Asset>): Asset {
  return {
    id: `a${nextId++}`,
    entryDate: '2026-08-01',
    category: 'INVESTMENT',
    subcategory: '일반계좌',
    institution: '미래에셋증권',
    assetClass: '미국주식',
    strategy: undefined,
    amount: 1_000_000,
    ...overrides,
  }
}

describe('assetCategoryColor', () => {
  it('4개 카테고리에 서로 다른 색을 배정한다', () => {
    const colors = new Set((['INVESTMENT', 'SAVINGS', 'LOAN', 'REAL_ESTATE'] as const).map(assetCategoryColor))
    expect(colors.size).toBe(4)
  })
})

describe('assetClassColorMap', () => {
  it('KNOWN_ASSET_CLASSES에 없는 자유 입력 자산군이 섞여도 실제 기록에 없는 항목이 슬롯을 차지하지 않는다', () => {
    // KNOWN_ASSET_CLASSES가 6개라 무조건 전부 깔고 시작하면 자유 입력 자산군 하나만 있어도
    // 팔레트(6색) 슬롯을 넘겨 미국주식과 같은 색으로 wrap되는 회귀가 있었다.
    const assets = [asset({ assetClass: '미국주식' }), asset({ assetClass: '부동산펀드' })]
    const colorOf = assetClassColorMap(assets)

    expect(colorOf('미국주식')).not.toBe(colorOf('부동산펀드'))
  })

  it('등장하지 않은 KNOWN_ASSET_CLASSES 항목은 슬롯을 차지하지 않는다(달러가 6번째라도 1번 슬롯을 받는다)', () => {
    const assets = [asset({ assetClass: '달러' }), asset({ assetClass: '부동산펀드' })]
    const colorOf = assetClassColorMap(assets)

    expect(colorOf('달러')).toBe('var(--asset-series-1)')
    expect(colorOf('부동산펀드')).toBe('var(--asset-series-2)')
  })

  it('기록에 없는 자산군을 조회하면 muted-foreground로 폴백한다', () => {
    const assets = [asset({ assetClass: '미국주식' })]
    const colorOf = assetClassColorMap(assets)

    expect(colorOf('존재하지않는자산군')).toBe('var(--muted-foreground)')
  })
})
