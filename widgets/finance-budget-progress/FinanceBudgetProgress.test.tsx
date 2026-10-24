import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FinanceBudgetProgress } from './FinanceBudgetProgress'
import type { CategoryIndex, CategoryIndexEntry, FinanceBudget, FinanceCategory, FinanceTransaction } from '@entities/finance'

vi.mock('@entities/meta', async () => {
  const { testLabelOf } = await import('@entities/meta/__fixtures__/testMeta')
  return { useMeta: () => ({ labelOf: testLabelOf }) }
})

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
  onCategorySelect?: (categoryId: string) => void
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
      onCategorySelect={props.onCategorySelect ?? vi.fn()}
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
    expect(screen.getByText('470원 / 550원')).toBeInTheDocument()
    // 외식: 점심+저녁 합
    expect(screen.getByText('270원 / 350원')).toBeInTheDocument()
    // 그룹 행(식비·외식) 2개에만 Σ 표시 — 시각용 Σ는 aria-hidden, 스크린리더엔 "하위 합계"
    expect(screen.getAllByText('Σ')).toHaveLength(2)
    for (const sigma of screen.getAllByText('Σ')) expect(sigma).toHaveAttribute('aria-hidden')
    expect(screen.getAllByText('하위 합계')).toHaveLength(2)
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
    expect(screen.queryByText('Σ')).not.toBeInTheDocument()
    expect(screen.getByText('180원 / 200원')).toBeInTheDocument()
  })
})

describe('FinanceBudgetProgress 예산 초과 표현', () => {
  it('소비는 예산을 넘으면 경고색 "초과"로 표시한다', () => {
    renderWidget({
      budgets: [budget('b-food', 'food', 100)],
      transactions: [tx('food', 150)],
      categoryTree: [cat('food', '식비')],
      index: new Map([idx('food', '식비')]),
    })
    expect(screen.getByText('초과 50원')).toHaveClass('text-destructive')
  })

  it('저축·수입은 목표를 넘기면 좋은 신호라 "초과 달성"으로 경고색 없이 표시한다', () => {
    const entry: CategoryIndexEntry = { type: 'SAVING', rootId: 'fund', name: '펀드', path: [{ id: 'fund', name: '펀드', sortOrder: 0 }], sortOrder: 0 }
    render(
      <FinanceBudgetProgress
        type="SAVING"
        budgets={[budget('b-fund', 'fund', 100)]}
        transactions={[tx('fund', 150)]}
        categoryTree={[{ ...cat('fund', '펀드'), type: 'SAVING' }]}
        index={new Map([['fund', entry]])}
        period={PERIOD}
        isLoading={false}
        isError={false}
        today={TODAY}
        onCategorySelect={vi.fn()}
      />,
    )
    const over = screen.getByText('초과 달성 50원')
    expect(over).not.toHaveClass('text-destructive')
  })
})

describe('FinanceBudgetProgress 예산 미설정 빠른 등록', () => {
  it('예산 없이 실적만 있는 카테고리에 추가 라우트 링크(categoryId 프리필)를 단다', () => {
    renderWidget({
      budgets: [],
      transactions: [tx('food', 30_000)],
      categoryTree: [cat('food', '식비')],
      index: new Map([idx('food', '식비')]),
    })

    expect(screen.getByRole('link', { name: '식비 예산 추가' })).toHaveAttribute('href', '/finance/budgets/expense/new?categoryId=food')
  })
})

describe('FinanceBudgetProgress 행 클릭', () => {
  it('예산 행·예산 미설정 행을 누르면 그 카테고리 id로 onCategorySelect를 호출한다', () => {
    const onCategorySelect = vi.fn()
    renderWidget({
      categoryTree: [cat('house', '주거비', [cat('fee', '관리비'), cat('rent', '월세')]), cat('food', '식비')],
      index: new Map([idx('house', '주거비'), idx('fee', '관리비'), idx('rent', '월세'), idx('food', '식비')]),
      budgets: [budget('b-fee', 'fee', 100), budget('b-rent', 'rent', 100)],
      transactions: [tx('fee', 50), tx('food', 30)],
      onCategorySelect,
    })

    fireEvent.click(screen.getByRole('button', { name: /^주거비.*내역 보기$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^관리비.*내역 보기$/ }))
    fireEvent.click(screen.getByRole('button', { name: '식비 내역 보기' }))

    expect(onCategorySelect.mock.calls).toEqual([['house'], ['fee'], ['food']])
  })
})
