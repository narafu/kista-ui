import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { strategyKeys, type Strategy } from '@entities/strategy'
import { StrategyFormPage } from './StrategyFormPage'

const { backMock, pushMock, strategyFormMock } = vi.hoisted(() => ({
  backMock: vi.fn(),
  pushMock: vi.fn(),
  strategyFormMock: vi.fn((_props: unknown) => null),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: backMock, push: pushMock }),
}))
vi.mock('./StrategyForm', () => ({
  StrategyForm: (props: unknown) => strategyFormMock(props),
}))

const initial: Strategy = {
  id: 'strategy-1',
  accountId: 'account-1',
  type: 'INFINITE',
  status: 'ACTIVE',
  ticker: 'TQQQ',
  cycleSeedType: 'MAX',
  initialUsdDeposit: 1000,
  divisionCount: 20,
  isReverseMode: false,
}

function withClient(client: QueryClient, ui: ReactNode) {
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>
}

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
}

describe('StrategyFormPage intercepted edit', () => {
  it('dismisses a successful intercepted edit with router.back instead of pushing a stale detail route', () => {
    const client = createClient()
    client.setQueryData(strategyKeys.detail(initial.id), initial)
    render(withClient(client, <StrategyFormPage accountId="account-1" dismiss="back" initial={initial} />))

    const props = strategyFormMock.mock.calls.at(-1)?.[0] as { onSuccess: () => void } | undefined
    if (!props) throw new Error('StrategyForm props were not captured')
    act(() => props.onSuccess())

    expect(backMock).toHaveBeenCalledOnce()
    expect(pushMock).not.toHaveBeenCalled()
  })

  it('passes the live detail cache to the form so trade-driven holdings changes reach it without a refresh', async () => {
    const client = createClient()
    client.setQueryData(strategyKeys.detail(initial.id), initial)
    render(withClient(client, <StrategyFormPage accountId="account-1" initial={initial} />))

    act(() => {
      client.setQueryData(strategyKeys.detail(initial.id), { ...initial, currentHoldings: 3 })
    })

    await waitFor(() => {
      expect(strategyFormMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ initial: expect.objectContaining({ currentHoldings: 3 }) }),
      )
    })
  })
})
