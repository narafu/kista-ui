import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CyclePerformanceList } from './CyclePerformanceList'

const useStatsCyclesQueryMock = vi.fn()
const useAccountsQueryMock = vi.fn()

vi.mock('@entities/stats', () => ({
  useStatsCyclesQuery: () => useStatsCyclesQueryMock(),
}))

vi.mock('@entities/account', () => ({
  useAccountsQuery: () => useAccountsQueryMock(),
}))

describe('CyclePerformanceList', () => {
  it('shows an error fallback instead of treating a failed request as empty cycle performance', () => {
    useStatsCyclesQueryMock.mockReturnValue({
      cycles: [],
      isLoading: false,
      isError: true,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    })
    useAccountsQueryMock.mockReturnValue({ data: [] })

    render(<CyclePerformanceList />)

    expect(screen.getByText('사이클 성과를 불러오지 못했습니다')).toBeInTheDocument()
    expect(screen.queryByText('사이클 내역이 없습니다.')).not.toBeInTheDocument()
  })

  it('전략 뱃지 앞에 계좌 닉네임 뱃지를 표시한다', () => {
    useStatsCyclesQueryMock.mockReturnValue({
      cycles: [
        {
          cycleId: 'cycle-1',
          accountId: 'account-1',
          strategyType: 'INFINITE',
          ticker: 'SOXL',
          startDate: '2026-01-01',
          endDate: null,
          startAmount: 1000,
          endAmount: null,
          pnl: null,
          returnRate: null,
          durationDays: null,
          closed: false,
        },
      ],
      isLoading: false,
      isError: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    })
    useAccountsQueryMock.mockReturnValue({
      data: [{ id: 'account-1', nickname: '메인계좌', accountNoMasked: '****0001', broker: 'KIS' }],
    })

    render(<CyclePerformanceList />)

    expect(screen.getAllByText('메인계좌').length).toBeGreaterThan(0)
  })
})
