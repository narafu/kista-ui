import { HydrationBoundary, QueryClient, QueryClientProvider, dehydrate } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { accountKeys, type Account } from '@entities/account'
import { strategyKeys, type Strategy } from '@entities/strategy'
import { StrategyDetailContent } from './StrategyDetailContent'

vi.mock('./StrategyDetail', () => ({
  StrategyDetail: () => null,
}))

const serverAccount: Account = {
  id: 'account-1',
  nickname: 'Server account',
  accountNoMasked: '111-***',
  broker: 'MOCK',
}

const serverStrategy: Strategy = {
  id: 'strategy-1',
  accountId: serverAccount.id,
  type: 'INFINITE',
  status: 'ACTIVE',
  ticker: 'TQQQ',
  cycleSeedType: 'MAX',
  initialUsdDeposit: 1000,
  divisionCount: 20,
  isReverseMode: false,
}

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
    },
  })
}

function content() {
  return (
    <StrategyDetailContent
      accountId={serverAccount.id}
      strategyId={serverStrategy.id}
      initialAccount={serverAccount}
      initialStrategy={serverStrategy}
    />
  )
}

describe('StrategyDetailContent', () => {
  it('keeps newer prewarmed detail data when stale destination hydration arrives', () => {
    const serverClient = createClient()
    serverClient.setQueryData(accountKeys.detail(serverAccount.id), serverAccount, { updatedAt: 100 })
    serverClient.setQueryData(strategyKeys.detail(serverStrategy.id), serverStrategy, { updatedAt: 100 })
    const browserClient = createClient()
    browserClient.setQueryData(accountKeys.detail(serverAccount.id), { ...serverAccount, nickname: 'Prewarmed account' }, { updatedAt: 200 })
    browserClient.setQueryData(strategyKeys.detail(serverStrategy.id), { ...serverStrategy, ticker: 'SOXL' }, { updatedAt: 200 })

    render(
      <QueryClientProvider client={browserClient}>
        <HydrationBoundary state={dehydrate(serverClient)}>
          {content()}
        </HydrationBoundary>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('heading', { name: 'SOXL' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Prewarmed account/ })).toBeInTheDocument()
  })

  it('updates the strategy and account headers from detail caches without a reload', async () => {
    const queryClient = createClient()
    queryClient.setQueryData(accountKeys.detail(serverAccount.id), serverAccount)
    queryClient.setQueryData(strategyKeys.detail(serverStrategy.id), serverStrategy)
    render(<QueryClientProvider client={queryClient}>{content()}</QueryClientProvider>)

    act(() => {
      queryClient.setQueryData(accountKeys.detail(serverAccount.id), { ...serverAccount, nickname: 'Edited account' })
      queryClient.setQueryData(strategyKeys.detail(serverStrategy.id), { ...serverStrategy, ticker: 'MAGX' })
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'MAGX' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Edited account/ })).toBeInTheDocument()
    })
  })
})
