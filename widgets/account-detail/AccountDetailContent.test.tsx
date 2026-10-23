import { HydrationBoundary, QueryClient, QueryClientProvider, dehydrate } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { accountKeys, type Account } from '@entities/account'
import { tradeKeys } from '@entities/trade'
import { getAccountPortfolio, getCryptoPortfolio } from '@entities/trade/api'
import { AccountDetailContent } from './AccountDetailContent'

vi.mock('@entities/trade/api', () => ({
  getAccountPortfolio: vi.fn(async () => ({})),
  getCryptoPortfolio: vi.fn(async () => ({ currency: 'KRW', cash: 1, totalAsset: 2, holdings: [] })),
}))

const { tabsMock } = vi.hoisted(() => ({ tabsMock: vi.fn((_props: unknown) => null) }))

vi.mock('./AccountDetailTabs', () => ({
  AccountDetailTabs: (props: unknown) => tabsMock(props),
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
    />
  )
}

describe('AccountDetailContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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

  it('reads deposit and evaluation from the portfolio cache so trade invalidation updates them without a refresh', async () => {
    const liveAccount: Account = { ...serverAccount, broker: 'KIS' }
    const queryClient = createClient()
    queryClient.setQueryData(accountKeys.detail(liveAccount.id), liveAccount)
    queryClient.setQueryData(tradeKeys.portfolio(liveAccount.id), { summary: { usdDeposit: 100, posEvalUsd: 200 } })
    render(<QueryClientProvider client={queryClient}>{content(liveAccount)}</QueryClientProvider>)

    expect(tabsMock).toHaveBeenLastCalledWith(expect.objectContaining({ usdDeposit: 100, posEvalUsd: 200 }))

    act(() => {
      queryClient.setQueryData(tradeKeys.portfolio(liveAccount.id), { summary: { usdDeposit: 50, posEvalUsd: 250 } })
    })

    await waitFor(() => {
      expect(tabsMock).toHaveBeenLastCalledWith(expect.objectContaining({ usdDeposit: 50, posEvalUsd: 250 }))
    })
  })

  it('업비트 계좌는 주식 포트폴리오를 부르지 않고 코인 포트폴리오를 부른다', async () => {
    const crypto: Account = { ...serverAccount, broker: 'UPBIT', accountNoMasked: null }
    const queryClient = createClient()
    queryClient.setQueryData(accountKeys.detail(crypto.id), crypto)
    render(<QueryClientProvider client={queryClient}>{content(crypto)}</QueryClientProvider>)

    await waitFor(() => expect(getCryptoPortfolio).toHaveBeenCalledWith('account-1', undefined))
    expect(getAccountPortfolio).not.toHaveBeenCalled()
  })
})
