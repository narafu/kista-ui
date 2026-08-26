import { describe, it, expect } from 'vitest'
import { buildBulkRegisterItems } from './bulkRegisterPreview'
import { buildCategoryIndex } from './categoryIndex'
import type { FinanceCategory } from '../model/types'

const incomeCategory: FinanceCategory = {
  id: 'cat-income', type: 'INCOME', name: '월급', sortOrder: 0, system: false, children: [],
}
const expenseCategory: FinanceCategory = {
  id: 'cat-expense', type: 'EXPENSE', name: '식비', sortOrder: 0, system: false, children: [],
}

describe('buildBulkRegisterItems', () => {
  it('거래내역을 카테고리 타입(INCOME/EXPENSE/SAVING) 기준으로 분류한다', () => {
    const index = buildCategoryIndex({ INCOME: [incomeCategory], EXPENSE: [expenseCategory] })
    const transactions = [
      { id: 't1', categoryId: 'cat-income', memo: '8월급', amount: 3650000, transactionDate: '2026-07-25' },
      { id: 't2', categoryId: 'cat-expense', memo: '생활비카드', amount: 480000, transactionDate: '2026-07-10' },
    ]

    const result = buildBulkRegisterItems({ transactions, assetSnapshots: [], index })

    expect(result.income).toHaveLength(1)
    expect(result.income[0].items).toHaveLength(1)
    expect(result.expense).toHaveLength(1)
    expect(result.income[0].items[0]).toMatchObject({ categoryId: 'cat-income', memo: '8월급', amount: 3650000, included: true })
  })

  it('카테고리가 삭제돼 index에 없는 거래는 어느 섹션에도 넣지 않는다', () => {
    const index = buildCategoryIndex({ INCOME: [incomeCategory] })
    const transactions = [{ id: 't1', categoryId: 'deleted-cat', memo: undefined, amount: 1000, transactionDate: '2026-07-01' }]

    const result = buildBulkRegisterItems({ transactions, assetSnapshots: [], index })

    expect(result.income).toHaveLength(0)
    expect(result.expense).toHaveLength(0)
    expect(result.saving).toHaveLength(0)
  })

  it('자산 스냅샷은 응답의 rootCategoryId/categoryName을 그대로 사용해 그룹핑한다', () => {
    const index = buildCategoryIndex({})
    const assetSnapshots = [
      {
        id: 'a1', categoryId: 'leaf-1', rootCategoryId: 'f1000000-0000-4000-8000-000000000401',
        categoryName: '예금', entryDate: '2026-07-01', assetClass: 'CASH' as const, market: 'DOMESTIC' as const, amount: 5000000,
      },
    ]

    const result = buildBulkRegisterItems({ transactions: [], assetSnapshots, index })

    expect(result.asset).toHaveLength(1)
    expect(result.asset[0].items[0]).toMatchObject({ categoryId: 'leaf-1', categoryName: '예금', amount: 5000000, included: true })
  })
})
