import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FinanceRecordList } from './FinanceRecordList'
import type { CategoryIndex, FinanceCategory, FinanceTransaction } from '@entities/finance'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const { useInfiniteMock } = vi.hoisted(() => ({ useInfiniteMock: vi.fn() }))

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useFinanceTransactionsInfiniteQuery: useInfiniteMock,
    useDeleteFinanceTransactionMutation: () => ({ mutate: vi.fn(), isPending: false }),
    useShareFinanceTransactionMutation: () => ({ mutate: vi.fn(), isPending: false }),
    useUnshareFinanceTransactionMutation: () => ({ mutate: vi.fn(), isPending: false }),
    useMonthlyClosingsQuery: () => ({ data: [] }),
    useMonthlyClosingScopeGroupId: () => undefined,
    useCanShareToGroup: () => false,
  }
})

const categoryTree: FinanceCategory[] = [
  { id: 'cat-1', type: 'EXPENSE', name: '식비', sortOrder: 0, system: false, children: [] },
]

const index: CategoryIndex = new Map([
  ['cat-1', { type: 'EXPENSE' as const, rootId: 'cat-1', name: '식비', path: [{ id: 'cat-1', name: '식비', sortOrder: 0 }], sortOrder: 0 }],
])

function tx(date: string, amount: number): FinanceTransaction {
  return { id: date, categoryId: 'cat-1', transactionDate: date, amount, memo: undefined }
}

function result(overrides: Record<string, unknown> = {}) {
  return {
    transactions: [] as FinanceTransaction[],
    isLoading: false,
    isError: false,
    isPlaceholderData: false,
    isFetching: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    fetchNextPage: vi.fn(),
    ...overrides,
  }
}

function renderList(props: Partial<React.ComponentProps<typeof FinanceRecordList>> = {}) {
  return render(
    <FinanceRecordList
      type="EXPENSE"
      categoryTree={categoryTree}
      index={index}
      period={{ month: '2026-08', mode: 'monthly' }}
      isLoading={false}
      isError={false}
      today="2026-08-23"
      categoryPath={[]}
      onCategoryPathChange={vi.fn()}
      {...props}
    />,
  )
}

const lastParams = () => useInfiniteMock.mock.calls.at(-1)?.[0]

describe('FinanceRecordList 서버 파라미터', () => {
  beforeEach(() => {
    useInfiniteMock.mockReset()
    useInfiniteMock.mockReturnValue(result({ transactions: [tx('2026-08-10', 20000)] }))
  })

  it('월간 모드는 그 달 범위·type·기본 정렬(날짜 내림차순)을 넘긴다', () => {
    renderList()
    expect(lastParams()).toEqual({ from: '2026-08-01', to: '2026-08-31', type: 'EXPENSE', categoryId: undefined, memo: undefined, sort: 'transactionDate,desc' })
  })

  it('연간 모드는 올해면 1월 1일~오늘 범위를 넘긴다', () => {
    renderList({ period: { month: '2026-08', mode: 'yearly' } })
    expect(lastParams()).toMatchObject({ from: '2026-01-01', to: '2026-08-23' })
  })

  it('카테고리 경로의 마지막 id를 categoryId로 넘긴다(하위 트리는 서버가 포함)', () => {
    renderList({ categoryPath: ['cat-0', 'cat-1'] })
    expect(lastParams()).toMatchObject({ categoryId: 'cat-1' })
  })

  it('헤더 정렬은 서버 sort 문자열(key,dir)로 바뀐다', () => {
    renderList()
    fireEvent.click(screen.getByRole('button', { name: /금액/ }))
    expect(lastParams()).toMatchObject({ sort: 'amount,desc' })
    fireEvent.click(screen.getByRole('button', { name: /금액/ }))
    expect(lastParams()).toMatchObject({ sort: 'amount,asc' })
  })

  describe('메모 검색', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('300ms 디바운스 뒤에 trim한 값을 memo로 넘긴다', () => {
      renderList()
      fireEvent.change(screen.getByRole('searchbox', { name: '메모 검색' }), { target: { value: ' apt ' } })
      expect(lastParams().memo).toBeUndefined()
      act(() => { vi.advanceTimersByTime(300) })
      expect(lastParams().memo).toBe('apt')
    })
  })
})

describe('FinanceRecordList 표시', () => {
  beforeEach(() => {
    useInfiniteMock.mockReset()
  })

  it('받은 내역을 표에 그린다', () => {
    useInfiniteMock.mockReturnValue(result({ transactions: [tx('2026-03-05', 10000), tx('2026-08-10', 20000)] }))
    renderList()
    expect(within(screen.getByRole('table', { name: '거래내역' })).getAllByRole('row')).toHaveLength(3)
  })

  it('그룹 소유 거래에만 데스크톱·모바일 모두 공유 배지를 붙인다', () => {
    useInfiniteMock.mockReturnValue(result({ transactions: [{ ...tx('2026-08-10', 20000), groupId: 'g1' }, tx('2026-08-11', 30000)] }))
    renderList()
    expect(screen.getAllByText('공유')).toHaveLength(2)
  })

  it('필터가 없고 결과가 비면 기간 빈 상태를 보인다', () => {
    useInfiniteMock.mockReturnValue(result())
    renderList()
    expect(screen.getByText(/이 기간에 등록된 거래내역이 없습니다/)).toBeInTheDocument()
    expect(screen.queryByRole('searchbox', { name: '메모 검색' })).not.toBeInTheDocument()
  })

  it('필터가 걸린 빈 결과는 입력창을 유지한 채 조건 빈 상태를 보인다', () => {
    useInfiniteMock.mockReturnValue(result())
    renderList({ categoryPath: ['cat-1'] })
    expect(screen.getByText('조건에 맞는 거래내역이 없습니다.')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: '메모 검색' })).toBeInTheDocument()
  })

  it('첫 로드만 로딩 문구를 보인다', () => {
    useInfiniteMock.mockReturnValue(result({ isLoading: true }))
    renderList()
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
  })

  it('다음 페이지가 있으면 더 보기 버튼 하나를 보이고 누르면 다음 페이지를 받는다', () => {
    const fetchNextPage = vi.fn()
    useInfiniteMock.mockReturnValue(result({ transactions: [tx('2026-08-10', 20000)], hasNextPage: true, fetchNextPage }))
    renderList()
    fireEvent.click(screen.getByRole('button', { name: '더 보기' }))
    expect(fetchNextPage).toHaveBeenCalledTimes(1)
  })

  it('정렬·필터가 바뀌어 이전 목록을 보이는 동안(placeholder)엔 더 보기를 숨기고 aria-busy를 건다', () => {
    useInfiniteMock.mockReturnValue(result({ transactions: [tx('2026-08-10', 20000)], hasNextPage: true, isPlaceholderData: true }))
    const { container } = renderList()
    expect(screen.queryByRole('button', { name: '더 보기' })).not.toBeInTheDocument()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })
})
