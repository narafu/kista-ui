import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockApi } from '@testing/mockApi'
import { renderApp } from '@testing/renderApp'
import { FinanceBudgetProgress } from './FinanceBudgetProgress'
import type { BudgetProgressNode, CategoryIndex, CategoryIndexEntry, FinanceBudget, FinanceCategory } from '@entities/finance'

const { useBudgetProgressQueryMock } = vi.hoisted(() => ({ useBudgetProgressQueryMock: vi.fn() }))

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return { ...actual, useBudgetProgressQuery: useBudgetProgressQueryMock }
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
// 서버 BudgetProgressNode — 자체 예산 노드(isGroup false)와 하위 합 그룹 노드(isGroup true)를 서버가 트리로 준다.
function node(categoryId: string, categoryName: string, allocated: number, actual: number, children: BudgetProgressNode[] = [], depth = 0): BudgetProgressNode {
  return {
    categoryId,
    categoryName,
    depth,
    isGroup: false,
    budgetId: `b-${categoryId}`,
    allocated,
    actual,
    remaining: allocated - actual,
    usageRatio: allocated > 0 ? Math.round((actual / allocated) * 10000) / 10000 : 0,
    children,
  }
}
function group(categoryId: string, categoryName: string, children: BudgetProgressNode[], depth = 0): BudgetProgressNode {
  const allocated = children.reduce((sum, child) => sum + child.allocated, 0)
  const actual = children.reduce((sum, child) => sum + child.actual, 0)
  return { ...node(categoryId, categoryName, allocated, actual, children, depth), isGroup: true, budgetId: null }
}

function mockProgress(nodes: BudgetProgressNode[], unbudgeted: { categoryId: string; categoryName: string; amount: number }[] = []) {
  useBudgetProgressQueryMock.mockReturnValue({ data: { nodes, unbudgeted }, isLoading: false, isError: false })
}

const PERIOD = { month: '2026-08', mode: 'monthly' } as const

function renderWidget(props: {
  categoryTree: FinanceCategory[]
  index: CategoryIndex
  isLoading?: boolean
  isError?: boolean
  onCategorySelect?: (categoryId: string) => void
}) {
  return renderApp(
    <FinanceBudgetProgress
      type="EXPENSE"
      categoryTree={props.categoryTree}
      index={props.index}
      period={PERIOD}
      isLoading={props.isLoading ?? false}
      isError={props.isError ?? false}
      onCategorySelect={props.onCategorySelect ?? vi.fn()}
    />,
  )
}

describe('FinanceBudgetProgress 조회·상태', () => {
  it('유형·기간으로 서버 예산 대비를 조회하고, 부모 준비 전엔 조회를 미루고 로딩을 그린다', () => {
    mockProgress([])
    renderWidget({ categoryTree: [], index: new Map(), isLoading: true })
    expect(useBudgetProgressQueryMock).toHaveBeenCalledWith('EXPENSE', PERIOD, { enabled: false })
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
  })

  it('조회 실패 시 에러 섹션을 표시한다', () => {
    useBudgetProgressQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderWidget({ categoryTree: [], index: new Map() })
    expect(screen.getByText('예산 대비 실적을 불러오지 못했습니다.')).toBeInTheDocument()
  })

  it('예산 노드가 없으면 빈 상태 안내를 표시한다', () => {
    mockProgress([])
    renderWidget({ categoryTree: [], index: new Map() })
    expect(screen.getByText('설정한 예산이 없습니다. 예산 관리에서 예산을 등록하세요.')).toBeInTheDocument()
  })
})

describe('FinanceBudgetProgress 중간 카테고리 소계', () => {
  it('자체 예산 없는 중간 카테고리를 Σ 소계 그룹 행으로 보여주고 하위를 중첩한다', () => {
    const categoryTree = [
      cat('food', '식비', [
        cat('dining', '외식', [cat('lunch', '점심'), cat('dinner', '저녁')]),
        cat('grocery', '장보기'),
      ]),
    ]
    const index: CategoryIndex = new Map([idx('food', '식비'), idx('dining', '외식'), idx('lunch', '점심'), idx('dinner', '저녁'), idx('grocery', '장보기')])
    mockProgress([
      group('food', '식비', [
        group('dining', '외식', [node('lunch', '점심', 200, 180, [], 2), node('dinner', '저녁', 150, 90, [], 2)], 1),
        node('grocery', '장보기', 200, 200, [], 1),
      ]),
    ])
    renderWidget({ categoryTree, index })

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
    mockProgress([node('food', '식비', 600, 190, [node('lunch', '점심', 200, 180, [], 1)])])
    renderWidget({ categoryTree, index })

    // 식비 자체 예산: 서브트리 실적 190 / 예산 600, Σ 접두 없음
    expect(screen.getByText('190원 / 600원')).toBeInTheDocument()
    expect(screen.queryByText('Σ')).not.toBeInTheDocument()
    expect(screen.getByText('180원 / 200원')).toBeInTheDocument()
  })
})

describe('FinanceBudgetProgress 예산 초과 표현', () => {
  it('소비는 예산을 넘으면 경고색 "초과"로 표시한다', () => {
    mockProgress([node('food', '식비', 100, 150)])
    renderWidget({
      categoryTree: [cat('food', '식비')],
      index: new Map([idx('food', '식비')]),
    })
    expect(screen.getByText('초과 50원')).toHaveClass('text-destructive')
  })

  it('저축·수입은 목표를 넘기면 좋은 신호라 "초과 달성"으로 경고색 없이 표시한다', () => {
    const entry: CategoryIndexEntry = { type: 'SAVING', rootId: 'fund', name: '펀드', path: [{ id: 'fund', name: '펀드', sortOrder: 0 }], sortOrder: 0 }
    mockProgress([node('fund', '펀드', 100, 150)])
    renderApp(
      <FinanceBudgetProgress
        type="SAVING"
        categoryTree={[{ ...cat('fund', '펀드'), type: 'SAVING' }]}
        index={new Map([['fund', entry]])}
        period={PERIOD}
        isLoading={false}
        isError={false}
        onCategorySelect={vi.fn()}
      />,
    )
    const over = screen.getByText('초과 달성 50원')
    expect(over).not.toHaveClass('text-destructive')
  })
})

describe('FinanceBudgetProgress 예산 미설정 빠른 등록', () => {
  beforeEach(() => {
    // jsdom의 history.back은 popstate를 보내지 않는다 — 브라우저처럼 다음 태스크에 보낸다(FormDialog가 popstate에서 닫힌다)
    vi.spyOn(window.history, 'back').mockImplementation(() => {
      setTimeout(() => window.dispatchEvent(new PopStateEvent('popstate', { state: null })))
    })
  })
  afterEach(() => vi.restoreAllMocks())

  it('예산 없이 실적만 있는 카테고리의 "예산 추가"는 그 카테고리가 채워진 대화상자를 열고, 제출하면 POST 후 닫힌다', async () => {
    const user = userEvent.setup()
    const food: FinanceCategory = cat('food', '식비')
    const { requests } = mockApi({
      'GET /api/finance/categories': { items: [food, cat('transit', '교통')] },
      'GET /api/finance/groups': { items: [] },
      'POST /api/finance/budgets': budget('b-new', 'food', 80_000),
    })
    mockProgress([], [{ categoryId: 'food', categoryName: '식비', amount: 30_000 }])
    renderWidget({
      categoryTree: [food],
      index: new Map([idx('food', '식비')]),
    })

    await user.click(screen.getByRole('button', { name: '식비 예산 추가' }))
    const dialog = await screen.findByRole('dialog', { name: '예산 추가' })
    await waitFor(() => expect(within(dialog).getByLabelText('카테고리')).toHaveTextContent('식비'))
    expect(within(dialog).getByLabelText('월 예산')).toHaveValue('')

    await user.type(within(dialog).getByLabelText('월 예산'), '80000')
    await user.click(within(dialog).getByRole('button', { name: '추가' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const posts = requests.filter((r) => r.method === 'POST')
    expect(posts).toHaveLength(1)
    expect(posts[0].body).toMatchObject({ categoryId: 'food', amount: 80_000 })
    expect(toast.success).toHaveBeenCalledWith('예산을 추가했습니다')
  })
})

describe('FinanceBudgetProgress 행 클릭', () => {
  it('예산 행·예산 미설정 행을 누르면 그 카테고리 id로 onCategorySelect를 호출한다', () => {
    const onCategorySelect = vi.fn()
    mockProgress(
      [group('house', '주거비', [node('fee', '관리비', 100, 50, [], 1), node('rent', '월세', 100, 0, [], 1)])],
      [{ categoryId: 'food', categoryName: '식비', amount: 30 }],
    )
    renderWidget({
      categoryTree: [cat('house', '주거비', [cat('fee', '관리비'), cat('rent', '월세')]), cat('food', '식비')],
      index: new Map([idx('house', '주거비'), idx('fee', '관리비'), idx('rent', '월세'), idx('food', '식비')]),
      onCategorySelect,
    })

    fireEvent.click(screen.getByRole('button', { name: /^주거비.*내역 보기$/ }))
    fireEvent.click(screen.getByRole('button', { name: /^관리비.*내역 보기$/ }))
    fireEvent.click(screen.getByRole('button', { name: '식비 내역 보기' }))

    expect(onCategorySelect.mock.calls).toEqual([['house'], ['fee'], ['food']])
  })
})
