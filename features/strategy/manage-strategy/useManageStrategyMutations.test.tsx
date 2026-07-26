import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { tradeKeys } from '@entities/trade'
import type { Strategy } from '@entities/strategy'
import { useManageStrategyMutations } from './useManageStrategyMutations'

const pauseMutate = vi.fn()
const resumeMutate = vi.fn()
const deleteMutate = vi.fn()
const executeMutate = vi.fn()

vi.mock('@entities/strategy', () => ({
  usePauseStrategyMutation: () => ({ mutate: pauseMutate, isPending: false }),
  useResumeStrategyMutation: () => ({ mutate: resumeMutate, isPending: false }),
  useDeleteStrategyMutation: () => ({ mutate: deleteMutate, isPending: false }),
  useExecuteStrategyMutation: () => ({ mutate: executeMutate, isPending: false }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const strategy: Strategy = {
  id: 'strategy-1',
  accountId: 'account-1',
  type: 'INFINITE',
  status: 'ACTIVE',
  ticker: 'MAGX',
  cycleSeedType: 'MAX',
  initialUsdDeposit: 1000,
  divisionCount: 20,
  isReverseMode: false,
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useManageStrategyMutations', () => {
  it('invalidates order previews after strategy configuration changes', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(orderKeys.preview(strategy.id), { orders: [] })
    queryClient.setQueryData(statsKeys.summary(), { total: 1 })
    queryClient.setQueryData(tradeKeys.strategyCycleHistory(strategy.id, null), { content: [] })
    pauseMutate.mockImplementation((_strategy, options) => options.onSuccess())

    const { result } = renderHook(() => useManageStrategyMutations(), {
      wrapper: createWrapper(queryClient),
    })

    act(() => result.current.pause(strategy))

    await waitFor(() => {
      expect(queryClient.getQueryState(orderKeys.preview(strategy.id))?.isInvalidated).toBe(true)
      expect(queryClient.getQueryState(statsKeys.summary())?.isInvalidated).toBe(true)
      expect(queryClient.getQueryState(tradeKeys.strategyCycleHistory(strategy.id, null))?.isInvalidated).toBe(true)
    })
  })
})
