import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardPage from './page'

const { getAuthTokenMock, getMonthlyHolidaysMock, getMonthlyHolidaysPublicMock } = vi.hoisted(() => ({
  getAuthTokenMock: vi.fn(),
  getMonthlyHolidaysMock: vi.fn(),
  getMonthlyHolidaysPublicMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  HydrationBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  dehydrate: vi.fn(() => ({})),
}))

vi.mock('@shared/lib/auth/token', () => ({
  getAuthToken: getAuthTokenMock,
}))

vi.mock('@entities/market', () => ({
  getMonthlyHolidays: getMonthlyHolidaysMock,
  getMonthlyHolidaysPublic: getMonthlyHolidaysPublicMock,
}))

vi.mock('@entities/account', () => ({
  accountListQueryOptions: vi.fn(() => ({})),
}))

vi.mock('@shared/lib/query', () => ({
  createQueryClient: () => ({ prefetchQuery: vi.fn() }),
}))

vi.mock('@widgets/dashboard/DashboardContent', () => ({
  DashboardContent: ({ holidays }: { holidays?: string[] }) => (
    <div>{holidays === undefined ? 'holiday-prefetch-unavailable' : `hydrated-holidays:${holidays.length}`}</div>
  ),
}))

vi.mock('@features/auth/logout', () => ({
  DashboardLogoutErrorToast: () => null,
}))

describe('DashboardPage holiday prefetch', () => {
  beforeEach(() => {
    getAuthTokenMock.mockReset()
    getMonthlyHolidaysMock.mockReset()
    getMonthlyHolidaysPublicMock.mockReset()
  })

  it('does not hydrate an authenticated holiday fetch failure as an empty month', async () => {
    getAuthTokenMock.mockResolvedValue('token-1')
    getMonthlyHolidaysMock.mockRejectedValue(new Error('holiday fetch failed'))

    render(await DashboardPage())

    expect(screen.getByText('holiday-prefetch-unavailable')).toBeInTheDocument()
  })

  it('does not hydrate a public holiday fetch failure as an empty month', async () => {
    getAuthTokenMock.mockResolvedValue(undefined)
    getMonthlyHolidaysPublicMock.mockRejectedValue(new Error('holiday fetch failed'))

    render(await DashboardPage())

    expect(screen.getByText('holiday-prefetch-unavailable')).toBeInTheDocument()
  })
})
