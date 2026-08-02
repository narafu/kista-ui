import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from './page'

const { getAuthTokenMock, monthlyHolidaysQueryOptionsMock, prefetchQueryMock } = vi.hoisted(() => ({
  getAuthTokenMock: vi.fn(),
  monthlyHolidaysQueryOptionsMock: vi.fn(),
  prefetchQueryMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  HydrationBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  dehydrate: vi.fn(() => ({})),
}))

vi.mock('@shared/lib/auth/token', () => ({
  getAuthToken: getAuthTokenMock,
}))

vi.mock('@entities/market', () => ({
  monthlyHolidaysQueryOptions: monthlyHolidaysQueryOptionsMock,
}))

vi.mock('@entities/account', () => ({
  accountListQueryOptions: vi.fn(() => ({ queryKey: ['accounts'] })),
}))

vi.mock('@shared/lib/query', () => ({
  createQueryClient: () => ({ prefetchQuery: prefetchQueryMock }),
}))

vi.mock('@widgets/market-holiday-calendar', () => ({
  WeeklyMarketCalendar: () => <div data-testid="weekly-market-calendar" />,
}))

vi.mock('@widgets/fear-greed-card', () => ({
  FearGreedSection: () => <div data-testid="fear-greed-section" />,
}))

vi.mock('@widgets/dashboard/DashboardContent', () => ({
  DashboardContent: ({ marketPanels }: { marketPanels: React.ReactNode }) => <div>{marketPanels}</div>,
}))

vi.mock('@features/auth/logout', () => ({
  DashboardLogoutErrorToast: () => null,
}))

describe('DashboardPage holiday prefetch', () => {
  beforeEach(() => {
    getAuthTokenMock.mockReset()
    monthlyHolidaysQueryOptionsMock.mockReset()
    prefetchQueryMock.mockReset()
    monthlyHolidaysQueryOptionsMock.mockReturnValue({ queryKey: ['market', 'holidays', 2026, 7] })
  })

  it('prefetches holidays through monthlyHolidaysQueryOptions with the auth token regardless of auth state', async () => {
    getAuthTokenMock.mockResolvedValue('token-1')
    prefetchQueryMock.mockResolvedValue(undefined)

    render(await DashboardPage())

    expect(monthlyHolidaysQueryOptionsMock).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), 'token-1')
    expect(prefetchQueryMock).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['market', 'holidays', 2026, 7] }))
  })

  it('still prefetches holidays for an unauthenticated visitor via the public branch inside monthlyHolidaysQueryOptions', async () => {
    getAuthTokenMock.mockResolvedValue(undefined)
    prefetchQueryMock.mockResolvedValue(undefined)

    render(await DashboardPage())

    expect(monthlyHolidaysQueryOptionsMock).toHaveBeenCalledWith(expect.any(Number), expect.any(Number), undefined)
  })

  it(
    'does not crash when the server-side holiday prefetch fails — a failed prefetch is never dehydrated ' +
    '(react-query only dehydrates status:"success" queries), so the client refetches instead of hydrating an empty month for 24h',
    async () => {
      getAuthTokenMock.mockResolvedValue(undefined)
      prefetchQueryMock.mockRejectedValue(new Error('holiday fetch failed'))

      render(await DashboardPage())

      expect(screen.getByTestId('weekly-market-calendar')).toBeInTheDocument()
      expect(screen.getByTestId('fear-greed-section')).toBeInTheDocument()
    },
  )
})
