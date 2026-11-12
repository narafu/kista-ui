import { describe, expect, it } from 'vitest'
import { budgetListHref, flowTypeFromSlug, flowTypeSlug } from './budgetRoutes'

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

  it('목록 라우트 href를 만든다', () => {
    expect(budgetListHref('EXPENSE')).toBe('/finance/budgets/expense')
  })
})
