import { describe, expect, it } from 'vitest'
import type { Asset } from '../model/types'
import {
  calcAssetClassBreakdown,
  calcAssetClassComposition,
  calcCategoryBreakdown,
  calcCategoryComposition,
  calcComposition,
  calcDateGroups,
  calcMissingAccounts,
  calcMissingCategories,
  calcMonthlySummary,
  calcMonthlyTrend,
  listAvailableMonths,
  previousMonthOf,
} from './aggregate'

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

describe('calcMonthlySummary', () => {
  it('순자산에서 대출을 실제로 차감한다 (레퍼런스 버그 수정 회귀 테스트)', () => {
    const assets = [
      asset({ category: 'INVESTMENT', amount: 10_000_000 }),
      asset({ category: 'LOAN', assetClass: '원화', amount: 3_000_000 }),
    ]

    const summary = calcMonthlySummary(assets, '2026-08')

    expect(summary.totalAssets).toBe(10_000_000)
    expect(summary.totalLiabilities).toBe(3_000_000)
    // 레퍼런스 버그였다면 netWorth === totalAssets(10,000,000)로 나왔을 것 — 대출이 실제로 반영돼야 한다
    expect(summary.netWorth).toBe(7_000_000)
    expect(summary.netWorth).not.toBe(summary.totalAssets)
  })

  it('가장 큰 자산군을 대출 제외 기준으로 계산한다', () => {
    const assets = [
      asset({ category: 'INVESTMENT', assetClass: '미국주식', amount: 5_000_000 }),
      asset({ category: 'INVESTMENT', assetClass: '크립토', amount: 2_000_000 }),
      asset({ category: 'LOAN', assetClass: '원화', amount: 100_000_000 }),
    ]

    const summary = calcMonthlySummary(assets, '2026-08')

    expect(summary.largestAssetClass).toEqual({ assetClass: '미국주식', amount: 5_000_000 })
  })

  it('해당 월 기록이 없으면 0과 null을 반환한다', () => {
    const summary = calcMonthlySummary([], '2026-08')
    expect(summary).toEqual({ netWorth: 0, totalAssets: 0, totalLiabilities: 0, largestAssetClass: null, recordCount: 0 })
  })
})

describe('calcCategoryBreakdown', () => {
  it('4개 카테고리를 고정 순서로 반환한다', () => {
    const assets = [
      asset({ category: 'INVESTMENT', amount: 1_000_000 }),
      asset({ category: 'LOAN', amount: 2_000_000 }),
    ]

    const breakdown = calcCategoryBreakdown(assets, '2026-08')

    expect(breakdown.map((b) => b.category)).toEqual(['INVESTMENT', 'SAVINGS', 'LOAN', 'REAL_ESTATE'])
    expect(breakdown.find((b) => b.category === 'INVESTMENT')?.amount).toBe(1_000_000)
    expect(breakdown.find((b) => b.category === 'SAVINGS')?.amount).toBe(0)
  })
})

describe('calcAssetClassBreakdown', () => {
  it('자유 입력한 미등록 자산군을 알려진 순서 뒤에 이어붙인다 (레퍼런스 누락 버그 수정 회귀 테스트)', () => {
    const assets = [
      asset({ category: 'INVESTMENT', assetClass: '미국주식', amount: 1_000_000 }),
      asset({ category: 'INVESTMENT', assetClass: '리츠', amount: 500_000 }), // 알려진 목록에 없는 자유 입력값
    ]

    const breakdown = calcAssetClassBreakdown(assets, '2026-08')

    // 레퍼런스 버그였다면 '리츠'가 결과에서 통째로 사라졌을 것
    expect(breakdown.map((b) => b.assetClass)).toContain('리츠')
    expect(breakdown.find((b) => b.assetClass === '리츠')?.amount).toBe(500_000)
  })

  it('대출 카테고리는 제외한다', () => {
    const assets = [asset({ category: 'LOAN', assetClass: '원화', amount: 1_000_000 })]

    const breakdown = calcAssetClassBreakdown(assets, '2026-08')

    expect(breakdown).toEqual([])
  })

  it('금액이 0인 알려진 자산군은 제외한다', () => {
    const assets = [asset({ category: 'INVESTMENT', assetClass: '미국주식', amount: 1_000_000 })]

    const breakdown = calcAssetClassBreakdown(assets, '2026-08')

    expect(breakdown.map((b) => b.assetClass)).toEqual(['미국주식'])
  })
})

describe('listAvailableMonths', () => {
  it('중복 없이 최신순으로 반환한다', () => {
    const assets = [
      asset({ entryDate: '2026-06-15' }),
      asset({ entryDate: '2026-08-01' }),
      asset({ entryDate: '2026-08-20' }),
    ]

    expect(listAvailableMonths(assets)).toEqual(['2026-08', '2026-06'])
  })
})

describe('calcMonthlyTrend', () => {
  it('netWorth 모드는 월별 순자산 추이를 오름차순으로 반환한다', () => {
    const assets = [
      asset({ entryDate: '2026-07-01', category: 'INVESTMENT', amount: 1_000_000 }),
      asset({ entryDate: '2026-08-01', category: 'INVESTMENT', amount: 3_000_000 }),
      asset({ entryDate: '2026-08-01', category: 'LOAN', assetClass: '원화', amount: 1_000_000 }),
    ]

    const trend = calcMonthlyTrend(assets, 'netWorth', null)

    expect(trend).toEqual([
      { month: '2026-07', amount: 1_000_000 },
      { month: '2026-08', amount: 2_000_000 },
    ])
  })

  it('assetClass 모드는 대출을 제외하고 선택 항목만 집계한다', () => {
    const assets = [
      asset({ entryDate: '2026-08-01', category: 'INVESTMENT', assetClass: '크립토', amount: 500_000 }),
      asset({ entryDate: '2026-08-01', category: 'INVESTMENT', assetClass: '미국주식', amount: 999_999 }),
    ]

    const trend = calcMonthlyTrend(assets, 'assetClass', '크립토')

    expect(trend).toEqual([{ month: '2026-08', amount: 500_000 }])
  })
})

describe('calcComposition', () => {
  it('월별 구성비를 계산하고 합이 100%가 되도록 한다', () => {
    const assets = [
      asset({ entryDate: '2026-08-01', category: 'INVESTMENT', amount: 3_000_000 }),
      asset({ entryDate: '2026-08-01', category: 'SAVINGS', amount: 1_000_000 }),
    ]

    const [column] = calcComposition(assets, ['INVESTMENT', 'SAVINGS'], (asset, item) => asset.category === item)

    expect(column.month).toBe('2026-08')
    expect(column.total).toBe(4_000_000)
    expect(column.entries.find((e) => e.item === 'INVESTMENT')?.percent).toBe(75)
    expect(column.entries.find((e) => e.item === 'SAVINGS')?.percent).toBe(25)
  })

  it('기록이 없는 월은 0%를 반환한다', () => {
    const [column] = calcComposition([], ['INVESTMENT'], (asset, item) => asset.category === item)
    expect(column).toBeUndefined()
  })
})

describe('calcCategoryComposition', () => {
  it('대출을 포함해 4개 카테고리 구성비를 계산한다 (레퍼런스와 동일하게 대출도 세그먼트로 표시)', () => {
    const assets = [
      asset({ entryDate: '2026-08-01', category: 'INVESTMENT', amount: 3_000_000 }),
      asset({ entryDate: '2026-08-01', category: 'LOAN', assetClass: '원화', amount: 1_000_000 }),
    ]

    const [column] = calcCategoryComposition(assets)

    expect(column.total).toBe(4_000_000)
    expect(column.entries.find((e) => e.item === 'LOAN')?.amount).toBe(1_000_000)
  })
})

describe('calcAssetClassComposition', () => {
  it('자산군별 현황(calcAssetClassBreakdown)과 동일하게 대출을 제외한다', () => {
    const assets = [
      asset({ entryDate: '2026-08-01', category: 'INVESTMENT', assetClass: '미국주식', amount: 1_000_000 }),
      asset({ entryDate: '2026-08-01', category: 'LOAN', assetClass: '원화', amount: 5_000_000 }),
    ]

    const [column] = calcAssetClassComposition(assets)

    // 레퍼런스급 버그였다면 대출 500만원이 분모에 섞여 미국주식 비중이 희석됐을 것
    expect(column.total).toBe(1_000_000)
    expect(column.entries.find((e) => e.item === '미국주식')?.percent).toBe(100)
  })

  it('자유 입력한 미등록 자산군을 분자·분모 양쪽에 포함한다 (누락 시 나머지 항목 비중이 부풀려지는 회귀 테스트)', () => {
    const assets = [
      asset({ entryDate: '2026-08-01', category: 'INVESTMENT', assetClass: '국내주식', amount: 7_000_000 }),
      asset({ entryDate: '2026-08-01', category: 'INVESTMENT', assetClass: '미국주식', amount: 3_000_000 }),
    ]

    const [column] = calcAssetClassComposition(assets)

    // 버그였다면 '국내주식'이 items 목록에 없어 통째로 빠지고, total=3,000,000·미국주식=100%로 나왔을 것
    expect(column.total).toBe(10_000_000)
    expect(column.entries.find((e) => e.item === '국내주식')?.percent).toBe(70)
    expect(column.entries.find((e) => e.item === '미국주식')?.percent).toBe(30)
  })
})

describe('월별 기록 점검', () => {
  it('calcMissingCategories: 이번 달 기록이 없는 카테고리를 찾는다', () => {
    const assets = [asset({ entryDate: '2026-08-01', category: 'INVESTMENT' })]

    expect(calcMissingCategories(assets, '2026-08')).toEqual(['SAVINGS', 'LOAN', 'REAL_ESTATE'])
  })

  it('calcMissingAccounts: 전월에는 있었지만 이번 달에 없는 계좌를 찾는다', () => {
    const assets = [
      asset({ entryDate: '2026-07-01', institution: '국민은행', subcategory: '전세자금대출', assetClass: '원화', category: 'LOAN' }),
      asset({ entryDate: '2026-08-01', institution: '미래에셋증권', subcategory: '일반계좌', assetClass: '미국주식', category: 'INVESTMENT' }),
    ]

    const missing = calcMissingAccounts(assets, '2026-08', '2026-07')

    expect(missing).toEqual(['국민은행 · 전세자금대출 · 원화'])
  })

  it('calcMissingAccounts: 이전 달이 없으면 빈 배열을 반환한다', () => {
    expect(calcMissingAccounts([], '2026-08', null)).toEqual([])
  })

  it('calcDateGroups: 같은 달에 섞인 기준일을 날짜별로 집계한다', () => {
    const assets = [
      asset({ entryDate: '2026-08-01' }),
      asset({ entryDate: '2026-08-01' }),
      asset({ entryDate: '2026-08-15' }),
    ]

    expect(calcDateGroups(assets, '2026-08')).toEqual([
      { date: '2026-08-01', count: 2 },
      { date: '2026-08-15', count: 1 },
    ])
  })

  it('previousMonthOf: 주어진 월보다 이전인 가장 최근 월을 찾는다', () => {
    expect(previousMonthOf(['2026-08', '2026-07', '2026-05'], '2026-08')).toBe('2026-07')
    expect(previousMonthOf(['2026-08'], '2026-08')).toBeNull()
  })
})
