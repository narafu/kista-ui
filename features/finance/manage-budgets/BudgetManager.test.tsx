import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BudgetManager } from './BudgetManager'
import type { FinanceBudget, FinanceCategory } from '@entities/finance'

const {
  useFinanceBudgetsQueryMock,
  useFinanceCategoriesQueryMock,
  useCanShareToGroupMock,
  deleteMutateMock,
  shareMutateMock,
  unshareMutateMock,
  createMutateMock,
  updateMutateMock,
} = vi.hoisted(() => ({
  useFinanceBudgetsQueryMock: vi.fn(),
  useFinanceCategoriesQueryMock: vi.fn(),
  useCanShareToGroupMock: vi.fn(() => false),
  deleteMutateMock: vi.fn(),
  shareMutateMock: vi.fn(),
  unshareMutateMock: vi.fn(),
  createMutateMock: vi.fn(),
  updateMutateMock: vi.fn(),
}))

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useFinanceBudgetsQuery: useFinanceBudgetsQueryMock,
    useFinanceCategoriesQuery: useFinanceCategoriesQueryMock,
    useCanShareToGroup: useCanShareToGroupMock,
    useDeleteFinanceBudgetMutation: () => ({ mutate: deleteMutateMock, isPending: false }),
    useShareFinanceBudgetMutation: () => ({ mutate: shareMutateMock, isPending: false }),
    useUnshareFinanceBudgetMutation: () => ({ mutate: unshareMutateMock, isPending: false }),
    useCreateFinanceBudgetMutation: () => ({ mutate: createMutateMock, isPending: false }),
    useUpdateFinanceBudgetMutation: () => ({ mutate: updateMutateMock, isPending: false }),
  }
})

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }))

const categoryTree: FinanceCategory[] = [
  { id: 'cat-food', type: 'EXPENSE', name: '식비', sortOrder: 0, system: false, children: [] },
  { id: 'cat-transit', type: 'EXPENSE', name: '교통', sortOrder: 1, system: false, children: [] },
]

function budget(overrides: Partial<FinanceBudget>): FinanceBudget {
  return {
    id: 'b1',
    categoryId: 'cat-food',
    applyStartDate: '2026-01-01',
    applyEndDate: undefined,
    amount: 100_000,
    ...overrides,
  }
}

describe('BudgetManager', () => {
  beforeEach(() => {
    useFinanceCategoriesQueryMock.mockReturnValue({ data: categoryTree })
    useCanShareToGroupMock.mockReturnValue(false)
    deleteMutateMock.mockClear()
    shareMutateMock.mockClear()
    unshareMutateMock.mockClear()
    createMutateMock.mockClear()
    updateMutateMock.mockClear()
  })

  it('복제 버튼을 클릭하면 다이얼로그가 열리고 카테고리·금액은 채워지지만 시작일은 비어있다', async () => {
    const user = userEvent.setup()
    useFinanceBudgetsQueryMock.mockReturnValue({
      data: [budget({ id: 'b1', categoryId: 'cat-food', amount: 100_000, applyStartDate: '2026-01-01' })],
    })
    render(<BudgetManager type="EXPENSE" />)

    await user.click(screen.getByRole('button', { name: '복제' }))

    expect(screen.getByRole('heading', { name: '예산 추가' })).toBeInTheDocument()
    expect(screen.getByLabelText('월 예산 (원)')).toHaveValue('100,000')
    expect(screen.getByLabelText('적용 시작일')).toHaveValue('')
  })

  it('복제 제출 시 create mutation이 호출된다(update 아님)', async () => {
    const user = userEvent.setup()
    useFinanceBudgetsQueryMock.mockReturnValue({
      data: [budget({ id: 'b1', categoryId: 'cat-food', amount: 100_000, applyStartDate: '2026-01-01' })],
    })
    render(<BudgetManager type="EXPENSE" />)

    await user.click(screen.getByRole('button', { name: '복제' }))
    await user.type(screen.getByLabelText('적용 시작일'), '2026-09-01')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(createMutateMock).toHaveBeenCalledTimes(1)
    expect(createMutateMock.mock.calls[0][0]).toMatchObject({ categoryId: 'cat-food', amount: 100_000, applyStartDate: '2026-09-01' })
    expect(updateMutateMock).not.toHaveBeenCalled()
  })

  it('공유 불가 상태에서는 복제·수정·삭제 순서로 아이콘 버튼이 나타난다', () => {
    useFinanceBudgetsQueryMock.mockReturnValue({ data: [budget({})] })
    render(<BudgetManager type="EXPENSE" />)

    const item = screen.getByText('식비').closest('li') as HTMLElement
    const labels = Array.from(item.querySelectorAll('[aria-label]')).map((el) => el.getAttribute('aria-label'))
    expect(labels).toEqual(['복제', '수정', '삭제'])
  })

  it('공유 가능 상태에서는 공유·복제·수정·삭제 순서로 아이콘 버튼이 나타난다', () => {
    useCanShareToGroupMock.mockReturnValue(true)
    useFinanceBudgetsQueryMock.mockReturnValue({ data: [budget({ groupId: undefined })] })
    render(<BudgetManager type="EXPENSE" />)

    const item = screen.getByText('식비').closest('li') as HTMLElement
    const labels = Array.from(item.querySelectorAll('[aria-label]')).map((el) => el.getAttribute('aria-label'))
    expect(labels).toEqual(['공유', '복제', '수정', '삭제'])
  })

  it('카테고리 필터를 적용하면 목록이 좁혀진다', async () => {
    const user = userEvent.setup()
    useFinanceBudgetsQueryMock.mockReturnValue({
      data: [
        budget({ id: 'b1', categoryId: 'cat-food' }),
        budget({ id: 'b2', categoryId: 'cat-transit', amount: 50_000 }),
      ],
    })
    render(<BudgetManager type="EXPENSE" />)

    const list = screen.getByRole('list', { name: '예산 목록' })
    expect(within(list).getByText('식비')).toBeInTheDocument()
    expect(within(list).getByText('교통')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: '카테고리' }))
    await user.click(await screen.findByRole('option', { name: '식비' }))

    expect(within(list).getByText('식비')).toBeInTheDocument()
    expect(within(list).queryByText('교통')).not.toBeInTheDocument()
  })

  it('상태 필터를 적용하면 진행중/종료 예산만 남는다', async () => {
    const user = userEvent.setup()
    useFinanceBudgetsQueryMock.mockReturnValue({
      data: [
        budget({ id: 'active', categoryId: 'cat-food', applyEndDate: undefined }),
        budget({ id: 'ended', categoryId: 'cat-transit', applyStartDate: '2020-01-01', applyEndDate: '2020-12-31' }),
      ],
    })
    render(<BudgetManager type="EXPENSE" />)

    // 기본 상태 필터가 '진행중'이라 종료된 예산은 초기 화면에 보이지 않는다 — 먼저 '전체 상태'로
    // 바꿔 둘 다 보이는 것을 확인한 뒤 필터 전환을 검증한다.
    const list = screen.getByRole('list', { name: '예산 목록' })
    await user.click(screen.getByRole('combobox', { name: '적용 상태' }))
    await user.click(await screen.findByRole('option', { name: '전체 상태' }))
    expect(within(list).getByText('식비')).toBeInTheDocument()
    expect(within(list).getByText('교통')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: '적용 상태' }))
    await user.click(await screen.findByRole('option', { name: '진행중' }))

    expect(within(list).getByText('식비')).toBeInTheDocument()
    expect(within(list).queryByText('교통')).not.toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: '적용 상태' }))
    await user.click(await screen.findByRole('option', { name: '종료' }))

    expect(within(list).queryByText('식비')).not.toBeInTheDocument()
    expect(within(list).getByText('교통')).toBeInTheDocument()
  })

  it('시작일이 미래인 예산은 종료일이 없어도 "진행중"으로 분류되지 않는다', async () => {
    const user = userEvent.setup()
    useFinanceBudgetsQueryMock.mockReturnValue({
      data: [budget({ id: 'not-started', categoryId: 'cat-food', applyStartDate: '2099-01-01', applyEndDate: undefined })],
    })
    render(<BudgetManager type="EXPENSE" />)

    await user.click(screen.getByRole('combobox', { name: '적용 상태' }))
    await user.click(await screen.findByRole('option', { name: '진행중' }))

    expect(screen.queryByText('식비')).not.toBeInTheDocument()
  })

  it('11건 이상이면 페이지가 나뉘고 다음 버튼으로 다음 페이지 항목을 볼 수 있다', async () => {
    const user = userEvent.setup()
    const budgets = Array.from({ length: 11 }, (_, i) =>
      budget({ id: `b${i}`, categoryId: 'cat-food', applyStartDate: `2026-01-${String(i + 1).padStart(2, '0')}`, amount: i })
    )
    useFinanceBudgetsQueryMock.mockReturnValue({ data: budgets })
    render(<BudgetManager type="EXPENSE" />)

    const list = screen.getByRole('list', { name: '예산 목록' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(10)

    await user.click(screen.getByRole('button', { name: 'Go to next page' }))

    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
  })

  it('필터 결과가 없으면 "등록된 예산 없음"이 아니라 "조건에 맞는 예산 없음"을 보여준다', async () => {
    const user = userEvent.setup()
    useFinanceBudgetsQueryMock.mockReturnValue({ data: [budget({ id: 'b1', categoryId: 'cat-food' })] })
    render(<BudgetManager type="EXPENSE" />)

    await user.click(screen.getByRole('combobox', { name: '카테고리' }))
    await user.click(await screen.findByRole('option', { name: '교통' }))

    expect(screen.getByText('조건에 맞는 예산이 없습니다.')).toBeInTheDocument()
    expect(screen.queryByText('등록된 예산이 없습니다.')).not.toBeInTheDocument()
  })
})
