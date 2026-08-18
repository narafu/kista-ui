import { describe, expect, it } from 'vitest'
import type { AssetSnapshot } from '../model/types'
import {
  SYSTEM_INVESTMENT_CATEGORY_ID,
  SYSTEM_LOAN_CATEGORY_ID,
  SYSTEM_REAL_ESTATE_CATEGORY_ID,
  SYSTEM_SAVINGS_CATEGORY_ID,
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
  formatAssetL1CategoryLabel,
  listAvailableMonths,
  previousMonthOf,
} from './aggregate'

let nextId = 1
function snapshot(overrides: Partial<AssetSnapshot>): AssetSnapshot {
  return {
    id: `s${nextId++}`,
    categoryId: SYSTEM_INVESTMENT_CATEGORY_ID,
    rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID,
    categoryName: '투자',
    accountName: '미래에셋증권',
    entryDate: '2026-08-01',
    assetClass: 'EQUITY',
    market: 'GLOBAL',
    strategy: undefined,
    amount: 1_000_000,
    ...overrides,
  }
}

describe('calcMonthlySummary', () => {
  it('순자산에서 대출을 실제로 차감한다 (레퍼런스 버그 수정 회귀 테스트)', () => {
    const snapshots = [
      snapshot({ rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID, amount: 10_000_000 }),
      snapshot({ rootCategoryId: SYSTEM_LOAN_CATEGORY_ID, assetClass: 'CASH', amount: 3_000_000 }),
    ]

    const summary = calcMonthlySummary(snapshots, '2026-08')

    expect(summary.totalAssets).toBe(10_000_000)
    expect(summary.totalLiabilities).toBe(3_000_000)
    // 레퍼런스 버그였다면 netWorth === totalAssets(10,000,000)로 나왔을 것 — 대출이 실제로 반영돼야 한다
    expect(summary.netWorth).toBe(7_000_000)
    expect(summary.netWorth).not.toBe(summary.totalAssets)
  })

  it('가장 큰 자산군을 대출 제외 기준으로 계산한다', () => {
    const snapshots = [
      snapshot({ rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID, assetClass: 'EQUITY', amount: 5_000_000 }),
      snapshot({ rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID, assetClass: 'CRYPTO', amount: 2_000_000 }),
      snapshot({ rootCategoryId: SYSTEM_LOAN_CATEGORY_ID, assetClass: 'CASH', amount: 100_000_000 }),
    ]

    const summary = calcMonthlySummary(snapshots, '2026-08')

    expect(summary.largestAssetClass).toEqual({ assetClass: 'EQUITY', amount: 5_000_000 })
  })

  it('해당 월 기록이 없으면 0과 null을 반환한다', () => {
    const summary = calcMonthlySummary([], '2026-08')
    expect(summary).toEqual({ netWorth: 0, totalAssets: 0, totalLiabilities: 0, largestAssetClass: null, recordCount: 0 })
  })
})

describe('calcCategoryBreakdown', () => {
  it('L1 카테고리 4개를 고정 순서로 반환한다', () => {
    const snapshots = [
      snapshot({ rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID, amount: 1_000_000 }),
      snapshot({ rootCategoryId: SYSTEM_LOAN_CATEGORY_ID, amount: 2_000_000 }),
    ]

    const breakdown = calcCategoryBreakdown(snapshots, '2026-08')

    expect(breakdown.map((b) => b.category)).toEqual([
      SYSTEM_INVESTMENT_CATEGORY_ID,
      SYSTEM_SAVINGS_CATEGORY_ID,
      SYSTEM_LOAN_CATEGORY_ID,
      SYSTEM_REAL_ESTATE_CATEGORY_ID,
    ])
    expect(breakdown.find((b) => b.category === SYSTEM_INVESTMENT_CATEGORY_ID)?.amount).toBe(1_000_000)
    expect(breakdown.find((b) => b.category === SYSTEM_SAVINGS_CATEGORY_ID)?.amount).toBe(0)
  })
})

describe('calcAssetClassBreakdown', () => {
  it('등장한 자산군을 AssetClass enum 고정 순서로 반환한다', () => {
    const snapshots = [
      snapshot({ assetClass: 'CRYPTO', amount: 500_000 }),
      snapshot({ assetClass: 'EQUITY', amount: 1_000_000 }),
    ]

    const breakdown = calcAssetClassBreakdown(snapshots, '2026-08')

    // ASSET_CLASS_ORDER = CASH, EQUITY, FIXED_INCOME, COMMODITY, CRYPTO, REAL_ESTATE — EQUITY가 CRYPTO보다 먼저
    expect(breakdown.map((b) => b.assetClass)).toEqual(['EQUITY', 'CRYPTO'])
  })

  it('대출 카테고리는 제외한다', () => {
    const snapshots = [snapshot({ rootCategoryId: SYSTEM_LOAN_CATEGORY_ID, assetClass: 'CASH', amount: 1_000_000 })]

    const breakdown = calcAssetClassBreakdown(snapshots, '2026-08')

    expect(breakdown).toEqual([])
  })

  it('금액이 0인 자산군은 제외한다', () => {
    const snapshots = [snapshot({ assetClass: 'EQUITY', amount: 1_000_000 })]

    const breakdown = calcAssetClassBreakdown(snapshots, '2026-08')

    expect(breakdown.map((b) => b.assetClass)).toEqual(['EQUITY'])
  })
})

describe('listAvailableMonths', () => {
  it('중복 없이 최신순으로 반환한다', () => {
    const snapshots = [
      snapshot({ entryDate: '2026-06-15' }),
      snapshot({ entryDate: '2026-08-01' }),
      snapshot({ entryDate: '2026-08-20' }),
    ]

    expect(listAvailableMonths(snapshots)).toEqual(['2026-08', '2026-06'])
  })
})

describe('calcMonthlyTrend', () => {
  it('netWorth 모드는 월별 순자산 추이를 오름차순으로 반환한다', () => {
    const snapshots = [
      snapshot({ entryDate: '2026-07-01', rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID, amount: 1_000_000 }),
      snapshot({ entryDate: '2026-08-01', rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID, amount: 3_000_000 }),
      snapshot({ entryDate: '2026-08-01', rootCategoryId: SYSTEM_LOAN_CATEGORY_ID, assetClass: 'CASH', amount: 1_000_000 }),
    ]

    const trend = calcMonthlyTrend(snapshots, 'netWorth', null)

    expect(trend).toEqual([
      { month: '2026-07', amount: 1_000_000 },
      { month: '2026-08', amount: 2_000_000 },
    ])
  })

  it('assetClass 모드는 대출을 제외하고 선택 항목만 집계한다', () => {
    const snapshots = [
      snapshot({ entryDate: '2026-08-01', assetClass: 'CRYPTO', amount: 500_000 }),
      snapshot({ entryDate: '2026-08-01', assetClass: 'EQUITY', amount: 999_999 }),
    ]

    const trend = calcMonthlyTrend(snapshots, 'assetClass', 'CRYPTO')

    expect(trend).toEqual([{ month: '2026-08', amount: 500_000 }])
  })
})

describe('calcComposition', () => {
  it('월별 구성비를 계산하고 합이 100%가 되도록 한다', () => {
    const snapshots = [
      snapshot({ entryDate: '2026-08-01', rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID, amount: 3_000_000 }),
      snapshot({ entryDate: '2026-08-01', rootCategoryId: SYSTEM_SAVINGS_CATEGORY_ID, amount: 1_000_000 }),
    ]

    const [column] = calcComposition(
      snapshots,
      [SYSTEM_INVESTMENT_CATEGORY_ID, SYSTEM_SAVINGS_CATEGORY_ID],
      (s, item) => s.rootCategoryId === item,
    )

    expect(column.month).toBe('2026-08')
    expect(column.total).toBe(4_000_000)
    expect(column.entries.find((e) => e.item === SYSTEM_INVESTMENT_CATEGORY_ID)?.percent).toBe(75)
    expect(column.entries.find((e) => e.item === SYSTEM_SAVINGS_CATEGORY_ID)?.percent).toBe(25)
  })

  it('기록이 없는 월은 0%를 반환한다', () => {
    const [column] = calcComposition([], [SYSTEM_INVESTMENT_CATEGORY_ID], (s, item) => s.rootCategoryId === item)
    expect(column).toBeUndefined()
  })
})

describe('calcCategoryComposition', () => {
  it('대출을 포함해 L1 4개 카테고리 구성비를 계산한다 (레퍼런스와 동일하게 대출도 세그먼트로 표시)', () => {
    const snapshots = [
      snapshot({ entryDate: '2026-08-01', rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID, amount: 3_000_000 }),
      snapshot({ entryDate: '2026-08-01', rootCategoryId: SYSTEM_LOAN_CATEGORY_ID, assetClass: 'CASH', amount: 1_000_000 }),
    ]

    const [column] = calcCategoryComposition(snapshots)

    expect(column.total).toBe(4_000_000)
    expect(column.entries.find((e) => e.item === SYSTEM_LOAN_CATEGORY_ID)?.amount).toBe(1_000_000)
  })
})

describe('calcAssetClassComposition', () => {
  it('자산군별 현황(calcAssetClassBreakdown)과 동일하게 대출을 제외한다', () => {
    const snapshots = [
      snapshot({ entryDate: '2026-08-01', assetClass: 'EQUITY', amount: 1_000_000 }),
      snapshot({ entryDate: '2026-08-01', rootCategoryId: SYSTEM_LOAN_CATEGORY_ID, assetClass: 'CASH', amount: 5_000_000 }),
    ]

    const [column] = calcAssetClassComposition(snapshots)

    // 레퍼런스급 버그였다면 대출 500만원이 분모에 섞여 EQUITY 비중이 희석됐을 것
    expect(column.total).toBe(1_000_000)
    expect(column.entries.find((e) => e.item === 'EQUITY')?.percent).toBe(100)
  })

  it('AssetClass 6종 전체를 items로 사용해 구성비를 정확히 계산한다', () => {
    const snapshots = [
      snapshot({ entryDate: '2026-08-01', assetClass: 'FIXED_INCOME', amount: 7_000_000 }),
      snapshot({ entryDate: '2026-08-01', assetClass: 'EQUITY', amount: 3_000_000 }),
    ]

    const [column] = calcAssetClassComposition(snapshots)

    expect(column.total).toBe(10_000_000)
    expect(column.entries.find((e) => e.item === 'FIXED_INCOME')?.percent).toBe(70)
    expect(column.entries.find((e) => e.item === 'EQUITY')?.percent).toBe(30)
  })
})

describe('formatAssetL1CategoryLabel', () => {
  it('4개 L1 카테고리 ID를 한글 라벨로 변환한다', () => {
    expect(formatAssetL1CategoryLabel(SYSTEM_INVESTMENT_CATEGORY_ID)).toBe('투자')
    expect(formatAssetL1CategoryLabel(SYSTEM_SAVINGS_CATEGORY_ID)).toBe('예적금')
    expect(formatAssetL1CategoryLabel(SYSTEM_LOAN_CATEGORY_ID)).toBe('대출')
    expect(formatAssetL1CategoryLabel(SYSTEM_REAL_ESTATE_CATEGORY_ID)).toBe('부동산')
  })

  it('알 수 없는 ID는 원본을 그대로 반환한다', () => {
    expect(formatAssetL1CategoryLabel('unknown-id')).toBe('unknown-id')
  })
})

describe('월별 기록 점검', () => {
  it('calcMissingCategories: 이번 달 기록이 없는 L1 카테고리를 찾는다', () => {
    const snapshots = [snapshot({ entryDate: '2026-08-01', rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID })]

    expect(calcMissingCategories(snapshots, '2026-08')).toEqual([
      SYSTEM_SAVINGS_CATEGORY_ID,
      SYSTEM_LOAN_CATEGORY_ID,
      SYSTEM_REAL_ESTATE_CATEGORY_ID,
    ])
  })

  it('calcMissingAccounts: 전월에는 있었지만 이번 달에 없는 계좌를 찾는다', () => {
    const snapshots = [
      snapshot({
        entryDate: '2026-07-01',
        accountName: '국민은행',
        categoryName: '전세자금대출',
        assetClass: 'CASH',
        rootCategoryId: SYSTEM_LOAN_CATEGORY_ID,
      }),
      snapshot({
        entryDate: '2026-08-01',
        accountName: '미래에셋증권',
        categoryName: '투자',
        assetClass: 'EQUITY',
        rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID,
      }),
    ]

    const missing = calcMissingAccounts(snapshots, '2026-08', '2026-07')

    expect(missing).toEqual(['국민은행 · 전세자금대출 · CASH'])
  })

  it('calcMissingAccounts: 이전 달이 없으면 빈 배열을 반환한다', () => {
    expect(calcMissingAccounts([], '2026-08', null)).toEqual([])
  })

  it('calcDateGroups: 같은 달에 섞인 기준일을 날짜별로 집계한다', () => {
    const snapshots = [
      snapshot({ entryDate: '2026-08-01' }),
      snapshot({ entryDate: '2026-08-01' }),
      snapshot({ entryDate: '2026-08-15' }),
    ]

    expect(calcDateGroups(snapshots, '2026-08')).toEqual([
      { date: '2026-08-01', count: 2 },
      { date: '2026-08-15', count: 1 },
    ])
  })

  it('previousMonthOf: 주어진 월보다 이전인 가장 최근 월을 찾는다', () => {
    expect(previousMonthOf(['2026-08', '2026-07', '2026-05'], '2026-08')).toBe('2026-07')
    expect(previousMonthOf(['2026-08'], '2026-08')).toBeNull()
  })
})
