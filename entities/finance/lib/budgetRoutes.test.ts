import { describe, expect, it } from 'vitest'
import { budgetListHref, editBudgetHref, flowTypeFromSlug, flowTypeSlug, newBudgetHref } from './budgetRoutes'

describe('budgetRoutes', () => {
  it('슬러그와 type을 양방향으로 변환한다', () => {
    expect(flowTypeFromSlug('income')).toBe('INCOME')
    expect(flowTypeFromSlug('expense')).toBe('EXPENSE')
    expect(flowTypeFromSlug('saving')).toBe('SAVING')
    expect(flowTypeSlug('SAVING')).toBe('saving')
  })

  it('알 수 없는 슬러그(대문자·asset 포함)는 null', () => {
    expect(flowTypeFromSlug('EXPENSE')).toBeNull()
    expect(flowTypeFromSlug('asset')).toBeNull()
    expect(flowTypeFromSlug('edit')).toBeNull()
  })

  it('라우트 href를 만든다', () => {
    expect(budgetListHref('EXPENSE')).toBe('/finance/budgets/expense')
    expect(newBudgetHref('INCOME')).toBe('/finance/budgets/income/new')
    expect(newBudgetHref('EXPENSE', { categoryId: 'c 1' })).toBe('/finance/budgets/expense/new?categoryId=c+1')
    expect(newBudgetHref('EXPENSE', { duplicateFrom: 'b1' })).toBe('/finance/budgets/expense/new?duplicateFrom=b1')
    expect(editBudgetHref('SAVING', 'b9')).toBe('/finance/budgets/saving/b9/edit')
  })
})
