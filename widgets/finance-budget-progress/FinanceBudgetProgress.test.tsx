import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FinanceBudgetProgress } from './FinanceBudgetProgress'
import type { CategoryIndex, CategoryIndexEntry, FinanceBudget, FinanceCategory, FinanceTransaction } from '@entities/finance'

vi.mock('@entities/meta', () => ({
  useMeta: () => ({ labelOf: () => '소비' }),
}))

function cat(id: string, name: string, children: FinanceCategory[] = []): FinanceCategory {
  return { id, type: 'EXPENSE', name, sortOrder: 0, system: false, children }
}
function idx(id: string, name: string): [string, CategoryIndexEntry] {
  return [id, { type: 'EXPENSE', rootId: 'food', name, path: [{ id, name, sortOrder: 0 }], sortOrder: 0 }]
}
function budget(id: string, categoryId: string, amount: number): FinanceBudget {
  return { id, categoryId, applyStartDate: '2026-01-01', amount }
}
function tx(categoryId: string, amount: number): FinanceTransaction {
  return { id: `${categoryId}-${amount}`, categoryId, transactionDate: '2026-08-10', amount }
}

const PERIOD = { month: '2026-08', mode: 'monthly' } as const
const TODAY = '2026-08-23'

function renderWidget(props: {
  budgets: FinanceBudget[]
  transactions: FinanceTransaction[]
  categoryTree: FinanceCategory[]
  index: CategoryIndex
}) {
  return render(
    <FinanceBudgetProgress
      type="EXPENSE"
      budgets={props.budgets}
      transactions={props.transactions}
      categoryTree={props.categoryTree}
      index={props.index}
      period={PERIOD}
      isLoading={false}
      isError={false}
      today={TODAY}
    />,
  )
}

describe('FinanceBudgetProgress 중간 카테고리 소계', () => {
  it('자체 예산 없는 중간 카테고리를 Σ 소계 그룹 행으로 보여주고 하위를 중첩한다', () => {
    const categoryTree = [
      cat('food', '식비', [
        cat('dining', '외식', [cat('lunch', '점심'), cat('dinner', '저녁')]),
        cat('grocery', '장보기'),
      ]),
    ]
    const index: CategoryIndex = new Map([idx('food', '식비'), idx('dining', '외식'), idx('lunch', '점심'), idx('dinner', '저녁'), idx('grocery', '장보기')])
    renderWidget({
      categoryTree,
      index,
      budgets: [budget('b-lunch', 'lunch', 200), budget('b-dinner', 'dinner', 150), budget('b-grocery', 'grocery', 200)],
      transactions: [tx('lunch', 180), tx('dinner', 90), tx('grocery', 200)],
    })

    // 식비: 하위 예산 합 (200+150+200) / 실적 (180+90+200)
    expect(screen.getByText('Σ 470원 / 550원')).toBeInTheDocument()
    // 외식: 점심+저녁 합
    expect(screen.getByText('Σ 270원 / 350원')).toBeInTheDocument()
    // 하위 leaf 예산 행은 Σ 없이
    expect(screen.getByText('180원 / 200원')).toBeInTheDocument()
    expect(screen.getByText('식비')).toBeInTheDocument()
    expect(screen.getByText('외식')).toBeInTheDocument()
  })

  it('중간 카테고리에 자체 예산이 있으면 Σ 없이 그 예산 숫자로 보여준다', () => {
    const categoryTree = [cat('food', '식비', [cat('lunch', '점심')])]
    const index: CategoryIndex = new Map([idx('food', '식비'), idx('lunch', '점심')])
    renderWidget({
      categoryTree,
      index,
      budgets: [budget('b-food', 'food', 600), budget('b-lunch', 'lunch', 200)],
      transactions: [tx('food', 10), tx('lunch', 180)],
    })

    // 식비 자체 예산: 서브트리 실적 190 / 예산 600, Σ 접두 없음
    expect(screen.getByText('190원 / 600원')).toBeInTheDocument()
    expect(screen.queryByText('Σ 190원 / 600원')).not.toBeInTheDocument()
    expect(screen.getByText('180원 / 200원')).toBeInTheDocument()
  })
})
