import { HydrationBoundary, QueryClient, QueryClientProvider, dehydrate } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { accountKeys, type Account } from '@entities/account'
import { AccountDetailContent } from './AccountDetailContent'

vi.mock('./AccountDetailTabs', () => ({
  AccountDetailTabs: () => null,
}))

const serverAccount: Account = {
  id: 'account-1',
  nickname: 'Server nickname',
  accountNoMasked: '111-***',
  broker: 'MOCK',
}

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
    },
  })
}

function content(account = serverAccount) {
  return (
    <AccountDetailContent
      accountId={account.id}
      initialAccount={account}
      usdDeposit={0}
      posEvalUsd={0}
    />
  )
}

describe('AccountDetailContent', () => {
  it('keeps a newer prewarmed detail when stale destination hydration arrives', () => {
    const serverClient = createClient()
    serverClient.setQueryData(accountKeys.detail(serverAccount.id), serverAccount, { updatedAt: 100 })
    const browserClient = createClient()
    const prewarmed = { ...serverAccount, nickname: 'Prewarmed nickname' }
    browserClient.setQueryData(accountKeys.detail(serverAccount.id), prewarmed, { updatedAt: 200 })

    render(
      <QueryClientProvider client={browserClient}>
        <HydrationBoundary state={dehydrate(serverClient)}>
          {content()}
        </HydrationBoundary>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Prewarmed nickname' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Server nickname' })).not.toBeInTheDocument()
  })

  it('updates the mutable account header from the detail cache without a reload', async () => {
    const queryClient = createClient()
    queryClient.setQueryData(accountKeys.detail(serverAccount.id), serverAccount)
    render(<QueryClientProvider client={queryClient}>{content()}</QueryClientProvider>)

    act(() => {
      queryClient.setQueryData(accountKeys.detail(serverAccount.id), {
        ...serverAccount,
        nickname: 'Edited nickname',
      })
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edited nickname' })).toBeInTheDocument()
    })
    expect(screen.queryByRole('heading', { name: 'Server nickname' })).not.toBeInTheDocument()
  })
})
