import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TradesTab } from './TradesTab'

const useAccountCycleHistoryQueryMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({}),
}))

vi.mock('@entities/trade', () => ({
  useAccountCycleHistoryQuery: (id: string, params: unknown) => useAccountCycleHistoryQueryMock(id, params),
}))

const fetchNextPage = vi.fn()

describe('TradesTab', () => {
  it('forwards the accountId to useAccountCycleHistoryQuery and titles the table 잔고 이력', () => {
    useAccountCycleHistoryQueryMock.mockReturnValue({
      cycleHistory: [],
      isLoading: false,
      fetchNextPage,
      hasNextPage: false,
      isFetchingNextPage: false,
    })

    render(<TradesTab accountId="account-42" />)

    expect(screen.getByText('잔고 이력')).toBeInTheDocument()
    expect(useAccountCycleHistoryQueryMock).toHaveBeenCalledWith('account-42', expect.anything())
  })

  it('calls fetchNextPage from the injected hook when 더 보기 is clicked', async () => {
    fetchNextPage.mockClear()
    useAccountCycleHistoryQueryMock.mockReturnValue({
      cycleHistory: [
        { createdAt: '2026-07-01T00:00:00Z', ticker: 'TSLA', holdings: 1, avgPrice: 300, usdDeposit: 100 },
      ],
      isLoading: false,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    })

    const user = userEvent.setup()
    render(<TradesTab accountId="account-42" />)

    await user.click(screen.getByRole('button', { name: '더 보기' }))

    expect(fetchNextPage).toHaveBeenCalledTimes(1)
  })
})
