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
  urlListeners,
} = vi.hoisted(() => {
  // 실제 Next.js처럼 history.replaceState가 useSearchParams를 갱신하도록 URL 변경을 구독자에게 알린다
  const urlListeners = new Set<() => void>()
  const original = window.history.replaceState.bind(window.history)
  window.history.replaceState = ((...args: Parameters<History['replaceState']>) => {
    original(...args)
    urlListeners.forEach((l) => l())
  }) as History['replaceState']
  return {
    useFinanceBudgetsQueryMock: vi.fn(),
    useFinanceCategoriesQueryMock: vi.fn(),
    useCanShareToGroupMock: vi.fn(() => false),
    deleteMutateMock: vi.fn(),
    shareMutateMock: vi.fn(),
    unshareMutateMock: vi.fn(),
    urlListeners,
  }
})

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
  }
})

vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await vi.importActual<typeof import('react')>('react')
  return {
    // PageSizeSelector가 useRouter를 호출한다(onChange를 넘기므로 실제로 쓰지는 않음)
    useRouter: () => ({ push: vi.fn() }),
    useSearchParams: () => {
      const search = useSyncExternalStore(
        (cb) => { urlListeners.add(cb); return () => { urlListeners.delete(cb) } },
        () => window.location.search,
      )
      return new URLSearchParams(search)
    },
  }
})

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
    window.history.replaceState(null, '', '/finance/budgets/expense')
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

  it('시작일이 미래인 예산은 "예정" 필터에만 나오고 "종료"에는 섞이지 않는다', async () => {
    const user = userEvent.setup()
    useFinanceBudgetsQueryMock.mockReturnValue({
      data: [budget({ id: 'not-started', categoryId: 'cat-food', applyStartDate: '2099-01-01', applyEndDate: undefined })],
    })
    render(<BudgetManager type="EXPENSE" />)

    await user.click(screen.getByRole('combobox', { name: '적용 상태' }))
    await user.click(await screen.findByRole('option', { name: '종료' }))
    expect(screen.queryByText('식비')).not.toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: '적용 상태' }))
    await user.click(await screen.findByRole('option', { name: '예정' }))
    expect(screen.getByText('식비')).toBeInTheDocument()
  })

  it('전체 상태에서 예정·종료 예산에는 상태 배지가 붙고 진행중에는 붙지 않는다', async () => {
    const user = userEvent.setup()
    useFinanceBudgetsQueryMock.mockReturnValue({
      data: [
        budget({ id: 'active', categoryId: 'cat-food', applyEndDate: undefined }),
        budget({ id: 'ended', categoryId: 'cat-transit', applyStartDate: '2020-01-01', applyEndDate: '2020-12-31' }),
      ],
    })
    render(<BudgetManager type="EXPENSE" />)

    await user.click(screen.getByRole('combobox', { name: '적용 상태' }))
    await user.click(await screen.findByRole('option', { name: '전체 상태' }))

    const items = within(screen.getByRole('list', { name: '예산 목록' })).getAllByRole('listitem')
    const ended = items.find((li) => within(li).queryByText('교통'))!
    const active = items.find((li) => within(li).queryByText('식비'))!
    expect(within(ended).getByText('종료')).toBeInTheDocument()
    expect(within(active).queryByText('진행중')).not.toBeInTheDocument()
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

    await user.click(screen.getByRole('button', { name: '다음 페이지' }))

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

  it('URL의 필터·페이지를 초기 상태로 읽는다', () => {
    window.history.replaceState(null, '', '/finance/budgets/expense?status=ENDED&category=cat-transit')
    useFinanceBudgetsQueryMock.mockReturnValue({
      data: [
        budget({ id: 'a', categoryId: 'cat-food', applyStartDate: '2020-01-01', applyEndDate: '2020-12-31' }),
        budget({ id: 'b', categoryId: 'cat-transit', applyStartDate: '2020-01-01', applyEndDate: '2020-12-31' }),
        budget({ id: 'c', categoryId: 'cat-transit' }),
      ],
    })
    render(<BudgetManager type="EXPENSE" />)

    const items = within(screen.getByRole('list', { name: '예산 목록' })).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(within(items[0]).getByText('교통')).toBeInTheDocument()
    expect(within(items[0]).getByText('종료')).toBeInTheDocument()
  })

  it('잘못된 URL 값은 기본값(진행중·전체 카테고리·1페이지·10개)으로 폴백한다', () => {
    window.history.replaceState(null, '', '/finance/budgets/expense?status=FOO&category=nope&page=-3&size=7')
    useFinanceBudgetsQueryMock.mockReturnValue({
      data: [
        budget({ id: 'active', categoryId: 'cat-food' }),
        budget({ id: 'ended', categoryId: 'cat-transit', applyStartDate: '2020-01-01', applyEndDate: '2020-12-31' }),
      ],
    })
    render(<BudgetManager type="EXPENSE" />)

    const list = screen.getByRole('list', { name: '예산 목록' })
    expect(within(list).getByText('식비')).toBeInTheDocument()
    expect(within(list).queryByText('교통')).not.toBeInTheDocument()
  })

  it('필터 변경은 URL에 기록되고 page는 지워진다(기본값은 생략)', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '/finance/budgets/expense?page=2')
    useFinanceBudgetsQueryMock.mockReturnValue({ data: [budget({})] })
    render(<BudgetManager type="EXPENSE" />)

    await user.click(screen.getByRole('combobox', { name: '적용 상태' }))
    await user.click(await screen.findByRole('option', { name: '종료' }))
    expect(window.location.search).toBe('?status=ENDED')

    await user.click(screen.getByRole('combobox', { name: '적용 상태' }))
    await user.click(await screen.findByRole('option', { name: '진행중' }))
    expect(window.location.search).toBe('')
  })

  it('범위를 벗어난 page는 마지막 페이지로 클램프한다', () => {
    window.history.replaceState(null, '', '/finance/budgets/expense?page=9')
    const budgets = Array.from({ length: 11 }, (_, i) =>
      budget({ id: `b${i}`, categoryId: 'cat-food', applyStartDate: `2026-01-${String(i + 1).padStart(2, '0')}` })
    )
    useFinanceBudgetsQueryMock.mockReturnValue({ data: budgets })
    render(<BudgetManager type="EXPENSE" />)

    expect(within(screen.getByRole('list', { name: '예산 목록' })).getAllByRole('listitem')).toHaveLength(1)
  })

  it('예산 추가·복제·수정은 각 라우트 링크다', () => {
    useFinanceBudgetsQueryMock.mockReturnValue({ data: [budget({ id: 'b1' })] })
    render(<BudgetManager type="EXPENSE" />)

    expect(screen.getByRole('link', { name: '예산 추가' })).toHaveAttribute('href', '/finance/budgets/expense/new')
    expect(screen.getByRole('link', { name: '복제' })).toHaveAttribute('href', '/finance/budgets/expense/new?duplicateFrom=b1')
    expect(screen.getByRole('link', { name: '수정' })).toHaveAttribute('href', '/finance/budgets/expense/b1/edit')
  })
})
