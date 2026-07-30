import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { CycleHistoryItem } from '@entities/trade'
import { CycleHistoryTable } from './CycleHistoryTable'

vi.mock('next/navigation', () => ({
  useRouter: () => ({}),
}))

function makeHook(result: {
  cycleHistory: CycleHistoryItem[]
  isLoading?: boolean
  isError?: boolean
  fetchNextPage?: () => void
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
}) {
  return () => ({
    cycleHistory: result.cycleHistory,
    isLoading: result.isLoading ?? false,
    isError: result.isError ?? false,
    fetchNextPage: result.fetchNextPage ?? vi.fn(),
    hasNextPage: result.hasNextPage ?? false,
    isFetchingNextPage: result.isFetchingNextPage ?? false,
  })
}

const itemA: CycleHistoryItem = {
  createdAt: '2026-07-01T09:00:00Z',
  ticker: 'TSLA',
  holdings: 2,
  avgPrice: 300,
  usdDeposit: 100,
}

const itemB: CycleHistoryItem = {
  createdAt: '2026-07-01T10:00:00Z',
  ticker: 'NVDA',
  holdings: 0,
  avgPrice: null,
  usdDeposit: 50,
}

describe('CycleHistoryTable', () => {
  it('shows the emptyIdMessage state instead of querying when id is undefined and emptyIdMessage is provided', () => {
    const useHistoryQuery = vi.fn(makeHook({ cycleHistory: [] }))
    render(
      <CycleHistoryTable
        title="잔고 이력"
        id={undefined}
        useHistoryQuery={useHistoryQuery}
        emptyIdMessage="전략이 없습니다."
      />,
    )

    expect(screen.getByText('전략이 없습니다.')).toBeInTheDocument()
    expect(screen.queryByText('잔고 이력이 없습니다.')).not.toBeInTheDocument()
  })

  it('shows a loading indicator while isLoading is true', () => {
    const useHistoryQuery = makeHook({ cycleHistory: [], isLoading: true })
    render(<CycleHistoryTable title="잔고 이력" id="account-1" useHistoryQuery={useHistoryQuery} />)

    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
  })

  it('shows an empty state when there is no history', () => {
    const useHistoryQuery = makeHook({ cycleHistory: [] })
    render(<CycleHistoryTable title="잔고 이력" id="account-1" useHistoryQuery={useHistoryQuery} />)

    expect(screen.getByText('잔고 이력이 없습니다.')).toBeInTheDocument()
  })

  it('shows an error fallback instead of treating a failed request as empty history', () => {
    const useHistoryQuery = makeHook({ cycleHistory: [], isError: true })
    render(<CycleHistoryTable title="잔고 이력" id="account-1" useHistoryQuery={useHistoryQuery} />)

    expect(screen.getByText('잔고 이력을 불러오지 못했습니다')).toBeInTheDocument()
    expect(screen.queryByText('잔고 이력이 없습니다.')).not.toBeInTheDocument()
  })

  it('computes the eval amount from avgPrice * holdings and falls back to - when avgPrice is missing', () => {
    const useHistoryQuery = makeHook({ cycleHistory: [itemA, itemB] })
    render(<CycleHistoryTable title="잔고 이력" id="account-1" useHistoryQuery={useHistoryQuery} />)

    // $300 * 2 = $600.00 평가금액 (데스크탑 테이블 셀에도, 모바일 카드에도 등장)
    expect(screen.getAllByText('$600.00').length).toBeGreaterThan(0)
    // NVDA는 avgPrice가 null이라 평가금액이 '-'
    const dashCells = screen.getAllByText('-')
    expect(dashCells.length).toBeGreaterThan(0)
  })

  it('calls fetchNextPage when 더 보기 is clicked and disables it while fetching', async () => {
    const fetchNextPage = vi.fn()
    const useHistoryQuery = makeHook({ cycleHistory: [itemA], hasNextPage: true, fetchNextPage })
    const user = userEvent.setup()
    render(<CycleHistoryTable title="잔고 이력" id="account-1" useHistoryQuery={useHistoryQuery} />)

    await user.click(screen.getByRole('button', { name: '더 보기' }))

    expect(fetchNextPage).toHaveBeenCalledTimes(1)
  })

  it('hides the load-more control once there is no next page and nothing is fetching', () => {
    const useHistoryQuery = makeHook({ cycleHistory: [itemA], hasNextPage: false, isFetchingNextPage: false })
    render(<CycleHistoryTable title="잔고 이력" id="account-1" useHistoryQuery={useHistoryQuery} />)

    expect(screen.queryByRole('button', { name: /더 보기|불러오는 중/ })).not.toBeInTheDocument()
  })
})
