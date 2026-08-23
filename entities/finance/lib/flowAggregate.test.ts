import { describe, expect, it } from 'vitest'
import { calcBudgetProgress, calcFlowTrend } from './flowAggregate'
import type { CategoryIndex } from './categoryIndex'
import type { FinanceBudget, FinanceCategory, FinanceTransaction } from '../model/types'

function tx(id: string, categoryId: string, transactionDate: string, amount: number): FinanceTransaction {
  return { id, categoryId, transactionDate, amount }
}

const index: CategoryIndex = new Map([
  ['cat-food', { type: 'EXPENSE', rootId: 'root-food', name: '식비', sortOrder: 1 }],
  ['cat-transport', { type: 'EXPENSE', rootId: 'root-transport', name: '교통', sortOrder: 2 }],
])

describe('calcFlowTrend', () => {
  it('월간 모드: 선택월 기준 최근 limit개월 버킷별 합계·카테고리별 합계를 반환한다', () => {
    const transactions = [
      tx('1', 'cat-food', '2026-07-10', 1000),
      tx('2', 'cat-transport', '2026-07-15', 500),
      tx('3', 'cat-food', '2026-08-01', 2000),
    ]

    const result = calcFlowTrend(transactions, index, { month: '2026-08', mode: 'monthly' }, 2)

    expect(result).toEqual([
      { period: '2026-07', amount: 1500, byCategory: { 'root-food': 1000, 'root-transport': 500 } },
      { period: '2026-08', amount: 2000, byCategory: { 'root-food': 2000 } },
    ])
  })

  it('연간 모드: 선택 연도 기준 최근 limit개년 버킷(각 연도 1월~선택월)별 합계를 반환한다', () => {
    const transactions = [
      tx('1', 'cat-food', '2025-03-01', 1000),
      tx('2', 'cat-food', '2025-09-01', 9999), // 선택월(08) 이후라 2025년 버킷에서 제외
      tx('3', 'cat-food', '2026-05-01', 3000),
    ]

    const result = calcFlowTrend(transactions, index, { month: '2026-08', mode: 'yearly' }, 2)

    expect(result).toEqual([
      { period: '2025', amount: 1000, byCategory: { 'root-food': 1000 } },
      { period: '2026', amount: 3000, byCategory: { 'root-food': 3000 } },
    ])
  })

  it('인덱스에 없는(삭제된) 카테고리 거래는 합계엔 포함하고 byCategory엔 넣지 않는다', () => {
    const transactions = [tx('1', 'cat-deleted', '2026-08-05', 500)]

    const result = calcFlowTrend(transactions, index, { month: '2026-08', mode: 'monthly' }, 1)

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

    const result = calcBudgetProgress(budgets, transactions, categoryTree, budgetIndex, { month: '2026-08', mode: 'monthly' })

    expect(result.map((r) => r.budgetId)).toEqual(['b-salary', 'b-bonus'])
  })
})
