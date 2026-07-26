import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { adminKeys } from '@entities/admin'
import type { AdminStats, AdminUser } from '@entities/admin'
import { AdminOverviewContent } from './AdminOverviewContent'

vi.mock('./AdminPendingList', () => ({
  AdminPendingList: () => <div data-testid="pending-list" />,
}))

const pendingUser: AdminUser = {
  id: 'pending-1', nickname: 'pending', status: 'PENDING', role: 'USER', createdAt: '2026-07-01T00:00:00Z',
}

const stats: AdminStats = {
  totalUsers: 2, pendingCount: 1, activeCount: 1, rejectedCount: 0, totalAccounts: 0,
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('AdminOverviewContent', () => {
  it('renders changed statistics and pending count from mutation-owned cache updates', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(adminKeys.stats(), stats)
    queryClient.setQueryData(adminKeys.users('PENDING'), [pendingUser])

    render(<AdminOverviewContent />, { wrapper: createWrapper(queryClient) })
    expect(screen.getByText('1명')).toBeInTheDocument()
    expect(screen.getAllByText('승인 대기')).toHaveLength(2)

    act(() => {
      queryClient.setQueryData(adminKeys.stats(), { ...stats, pendingCount: 0, activeCount: 2 })
      queryClient.setQueryData(adminKeys.users('PENDING'), [])
    })

    await waitFor(() => {
      expect(screen.queryByText('1명')).not.toBeInTheDocument()
      const activeCard = screen.getByText('승인됨').closest('div.rounded-xl')
      expect(activeCard).not.toBeNull()
      expect(within(activeCard as HTMLElement).getByText('2')).toBeInTheDocument()
    })
  })
})
