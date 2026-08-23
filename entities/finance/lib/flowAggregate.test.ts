import { describe, expect, it } from 'vitest'
import { calcBudgetProgress, calcFlowSummary, calcFlowTrend } from './flowAggregate'
import type { CategoryIndex } from './categoryIndex'
import type { FinanceBudget, FinanceCategory, FinanceTransaction } from '../model/types'

function tx(id: string, categoryId: string, transactionDate: string, amount: number): FinanceTransaction {
  return { id, categoryId, transactionDate, amount }
}

const index: CategoryIndex = new Map([
  ['cat-food', { type: 'EXPENSE', rootId: 'root-food', name: '식비', sortOrder: 1 }],
  ['cat-transport', { type: 'EXPENSE', rootId: 'root-transport', name: '교통', sortOrder: 2 }],
])

describe('calcFlowSummary', () => {
  it('연간 모드: 올해를 선택하면 1월~오늘까지(YTD)만 합산한다', () => {
    const transactions = [
      tx('1', 'cat-food', '2026-02-01', 1000),
      tx('2', 'cat-food', '2026-08-23', 2000),
      tx('3', 'cat-food', '2026-09-01', 9999), // 오늘(08-23) 이후 — 제외
    ]

    const result = calcFlowSummary(transactions, { month: '2026-03', mode: 'yearly' }, '2026-08-23')

    expect(result).toEqual({ total: 3000, count: 2, previousTotal: null })
  })

  it('연간 모드: 이미 끝난 과거 연도를 선택하면 period.month의 mm과 무관하게 1~12월 전체를 합산한다', () => {
    const transactions = [
      tx('1', 'cat-food', '2025-01-01', 1000),
      tx('2', 'cat-food', '2025-12-31', 2000),
      tx('3', 'cat-food', '2024-12-31', 9999), // 전년 — 제외
    ]

    // month의 mm이 '03'이어도(월간 탭에서 남은 값) 과거 연도(2025)면 12월까지 전부 합산돼야 한다.
    const result = calcFlowSummary(transactions, { month: '2025-03', mode: 'yearly' }, '2026-08-23')

    expect(result).toEqual({ total: 3000, count: 2, previousTotal: null })
  })
})

describe('calcFlowTrend', () => {
  it('월간 모드: 선택월 기준 최근 limit개월 버킷별 합계·카테고리별 합계를 반환한다', () => {
    const transactions = [
      tx('1', 'cat-food', '2026-07-10', 1000),
      tx('2', 'cat-transport', '2026-07-15', 500),
      tx('3', 'cat-food', '2026-08-01', 2000),
    ]

    const result = calcFlowTrend(transactions, index, { month: '2026-08', mode: 'monthly' }, '2026-08-23', 2)

    expect(result).toEqual([
      { period: '2026-07', amount: 1500, byCategory: { 'root-food': 1000, 'root-transport': 500 } },
      { period: '2026-08', amount: 2000, byCategory: { 'root-food': 2000 } },
    ])
  })

  it('연간 모드: 과거 연도 버킷은 1~12월 전체, 올해 버킷은 오늘까지(YTD)만 합산한다', () => {
    const transactions = [
      tx('1', 'cat-food', '2025-03-01', 1000),
      tx('2', 'cat-food', '2025-12-31', 500), // 과거 연도(2025)는 12월까지 전부 포함
      tx('3', 'cat-food', '2026-05-01', 3000), // 올해(2026), 오늘 이전 — 포함
      tx('4', 'cat-food', '2026-08-24', 9999), // 올해, 오늘(08-23) 이후 — 제외
    ]

    const result = calcFlowTrend(transactions, index, { month: '2026-08', mode: 'yearly' }, '2026-08-23', 2)

    expect(result).toEqual([
      { period: '2025', amount: 1500, byCategory: { 'root-food': 1500 } },
      { period: '2026', amount: 3000, byCategory: { 'root-food': 3000 } },
    ])
  })

  it('인덱스에 없는(삭제된) 카테고리 거래는 합계엔 포함하고 byCategory엔 넣지 않는다', () => {
    const transactions = [tx('1', 'cat-deleted', '2026-08-05', 500)]

    const result = calcFlowTrend(transactions, index, { month: '2026-08', mode: 'monthly' }, '2026-08-23', 1)

    expect(result).toEqual([{ period: '2026-08', amount: 500, byCategory: {} }])
  })
})

describe('calcBudgetProgress', () => {
  it('usageRatio가 아니라 카테고리 순번(sortOrder)으로 정렬한다', () => {
    const categoryTree: FinanceCategory[] = [
      { id: 'cat-salary', type: 'INCOME', name: '급여', sortOrder: 1, system: false, children: [] },
      { id: 'cat-bonus', type: 'INCOME', name: '상여', sortOrder: 2, system: false, children: [] },
    ]
    const budgetIndex: CategoryIndex = new Map([
      ['cat-salary', { type: 'INCOME', rootId: 'cat-salary', name: '급여', sortOrder: 1 }],
      ['cat-bonus', { type: 'INCOME', rootId: 'cat-bonus', name: '상여', sortOrder: 2 }],
    ])
    const budgets: FinanceBudget[] = [
      { id: 'b-bonus', categoryId: 'cat-bonus', applyStartDate: '2026-01-01', amount: 100 },
      { id: 'b-salary', categoryId: 'cat-salary', applyStartDate: '2026-01-01', amount: 100 },
    ]
    // 상여(usageRatio 0.9)가 급여(usageRatio 0.1)보다 사용률은 높지만, 카테고리 순번상 급여가 먼저다.
    const transactions = [
      tx('1', 'cat-salary', '2026-08-05', 10),
      tx('2', 'cat-bonus', '2026-08-05', 90),
    ]

    const result = calcBudgetProgress(budgets, transactions, categoryTree, budgetIndex, { month: '2026-08', mode: 'monthly' }, '2026-08-23')

    expect(result.map((r) => r.budgetId)).toEqual(['b-salary', 'b-bonus'])
  })

  it('연간 모드: 과거 연도를 선택하면 period.month의 mm과 무관하게 12개월 전체를 유효 개월로 할당한다', () => {
    const categoryTree: FinanceCategory[] = [
      { id: 'cat-food', type: 'EXPENSE', name: '식비', sortOrder: 1, system: false, children: [] },
    ]
    const budgets: FinanceBudget[] = [
      { id: 'b-food', categoryId: 'cat-food', applyStartDate: '2025-01-01', amount: 100 },
    ]
    const transactions = [
      tx('1', 'cat-food', '2025-03-01', 50),
      tx('2', 'cat-food', '2025-11-01', 50),
    ]

    // month의 mm이 '03'이어도(월간 탭에서 남은 값) 과거 연도(2025)면 12개월(1200) 전체가 allocated다 —
    // mm 기준으로 세면 3개월(300)로 잘못 계산되던 버그의 회귀 테스트.
    const result = calcBudgetProgress(budgets, transactions, categoryTree, index, { month: '2025-03', mode: 'yearly' }, '2026-08-23')

    expect(result).toEqual([
      { budgetId: 'b-food', categoryId: 'cat-food', categoryName: '식비', allocated: 1200, actual: 100, remaining: 1100, usageRatio: 100 / 1200 },
    ])
  })
})
