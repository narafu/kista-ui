import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { act, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { accountKeys, type Account } from '@entities/account'
import { tradeKeys } from '@entities/trade'
import { createQueryClient } from '@shared/lib/query'
import { apiError, mockApi, type ApiHandlers } from '@testing/mockApi'
import { renderApp } from '@testing/renderApp'
import { AccountDetailContent } from './AccountDetailContent'

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

const ledgerTotals: ApiHandlers = {
  'GET /api/accounts/{accountId}/ledger-totals': { currency: 'USD', deposit: 0 },
}

function renderContent(account: Account, seed: (client: ReturnType<typeof createQueryClient>) => void = () => {}) {
  const queryClient = createQueryClient()
  queryClient.setQueryData(accountKeys.detail(account.id), account)
  seed(queryClient)
  renderApp(<AccountDetailContent accountId={account.id} initialAccount={account} />, { queryClient })
  return queryClient
}

describe('AccountDetailContent', () => {
  it('keeps a newer prewarmed detail when stale destination hydration arrives', () => {
    mockApi(ledgerTotals)
    const serverClient = createQueryClient()
    serverClient.setQueryData(accountKeys.detail(serverAccount.id), serverAccount, { updatedAt: Date.now() - 1000 })
    const browserClient = createQueryClient()
    const prewarmed = { ...serverAccount, nickname: 'Prewarmed nickname' }
    browserClient.setQueryData(accountKeys.detail(serverAccount.id), prewarmed, { updatedAt: Date.now() })

    renderApp(
      <HydrationBoundary state={dehydrate(serverClient)}>
        <AccountDetailContent accountId={serverAccount.id} initialAccount={serverAccount} />
      </HydrationBoundary>,
      { queryClient: browserClient },
    )

    expect(screen.getByRole('heading', { name: 'Prewarmed nickname' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Server nickname' })).not.toBeInTheDocument()
  })

  it('updates the mutable account header from the detail cache without a reload', async () => {
    mockApi(ledgerTotals)
    const queryClient = renderContent(serverAccount)

    act(() => {
      queryClient.setQueryData(accountKeys.detail(serverAccount.id), { ...serverAccount, nickname: 'Edited nickname' })
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edited nickname' })).toBeInTheDocument()
    })
    expect(screen.queryByRole('heading', { name: 'Server nickname' })).not.toBeInTheDocument()
  })

  it('reads deposit and evaluation from the portfolio cache so trade invalidation updates them without a refresh', async () => {
    mockApi(ledgerTotals)
    const liveAccount: Account = { ...serverAccount, broker: 'KIS' }
    const queryClient = renderContent(liveAccount, (client) => {
      client.setQueryData(tradeKeys.portfolio(liveAccount.id), { summary: { deposit: 100, posEvalUsd: 200 } })
    })

    expect(tabsMock).toHaveBeenLastCalledWith(expect.objectContaining({ deposit: 100, posEvalUsd: 200 }))

    act(() => {
      queryClient.setQueryData(tradeKeys.portfolio(liveAccount.id), { summary: { deposit: 50, posEvalUsd: 250 } })
    })

    await waitFor(() => {
      expect(tabsMock).toHaveBeenLastCalledWith(expect.objectContaining({ deposit: 50, posEvalUsd: 250 }))
    })
  })

  it('전략 합산 조회가 실패하면 ledgerTotalsError를 넘긴다', async () => {
    mockApi({
      'GET /api/accounts/{accountId}/ledger-totals': apiError(500),
      'GET /api/accounts/{accountId}/portfolio': {},
    })
    renderContent({ ...serverAccount, broker: 'KIS' })

    await waitFor(() => {
      expect(tabsMock).toHaveBeenCalledWith(expect.objectContaining({ ledgerTotalsError: true }))
    })
  })

  it('업비트 계좌는 주식 포트폴리오를 부르지 않고 크립토 포트폴리오를 부른다', async () => {
    // 주식 포트폴리오 경로는 등록하지 않는다 — 부르면 mockApi가 테스트를 실패시킨다
    const api = mockApi({
      ...ledgerTotals,
      'GET /api/accounts/{accountId}/crypto-portfolio': { currency: 'KRW', cash: 1, totalAsset: 2, holdings: [] },
    })
    renderContent({ ...serverAccount, broker: 'UPBIT', accountNoMasked: null })

    await waitFor(() => expect(api.requests.map((r) => r.path)).toContain('/api/accounts/account-1/crypto-portfolio'))
    expect(api.requests.map((r) => r.path)).not.toContain('/api/accounts/account-1/portfolio')
  })
})
