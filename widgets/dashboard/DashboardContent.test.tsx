import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { Account } from '@entities/account'
import { accountKeys } from '@entities/account'
import { createQueryClient } from '@shared/lib/query'
import { DashboardContent } from './DashboardContent'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('next/image', () => ({
  default: (props: React.ComponentProps<'img'>) => <img {...props} />,
}))

vi.mock('@widgets/market-holiday-calendar', () => ({
  WeeklyMarketCalendar: ({ accountIds }: { accountIds: string[] }) => (
    <div data-testid="calendar-account-ids">{accountIds.join(',')}</div>
  ),
}))

vi.mock('@widgets/dashboard/MarketChartCard', () => ({
  MarketChartCard: () => <div>market chart</div>,
}))

vi.mock('@widgets/fear-greed-card', () => ({
  FearGreedSection: () => <div>fear greed</div>,
}))

vi.mock('@features/account/create-account', () => ({
  NewAccountButton: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
}))

const account: Account = {
  id: 'account-1',
  nickname: '캐시 계좌',
  accountNoMasked: '123-***',
  broker: 'MOCK',
}

function renderWithClient(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <DashboardContent holidays={[]} initialWeekStartDate="2026-07-26" />
    </QueryClientProvider>,
  )
}

describe('DashboardContent', () => {
  it('switches from the first-account CTA to the overview when the query cache gains an account', async () => {
    const client = createQueryClient()
    client.setQueryData(accountKeys.list(), [])

    renderWithClient(client)
    expect(screen.getByText('첫 계좌 등록')).toBeInTheDocument()

    client.setQueryData(accountKeys.list(), [account])

    await waitFor(() => {
      expect(screen.queryByText('첫 계좌 등록')).not.toBeInTheDocument()
    })
    expect(screen.getAllByTestId('calendar-account-ids')[0]).toHaveTextContent('account-1')
  })
})
