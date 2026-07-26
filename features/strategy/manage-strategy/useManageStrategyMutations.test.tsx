import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { tradeKeys } from '@entities/trade'
import type { Strategy } from '@entities/strategy'
import { useManageStrategyMutations } from './useManageStrategyMutations'

const pauseMutate = vi.fn()
const resumeMutate = vi.fn()
const deleteMutate = vi.fn()
const executeMutate = vi.fn()
let executeSuccessHandler: (() => void | Promise<void>) | undefined
const { toastSuccessMock } = vi.hoisted(() => ({ toastSuccessMock: vi.fn() }))

vi.mock('@entities/strategy', () => ({
  usePauseStrategyMutation: () => ({ mutate: pauseMutate, isPending: false }),
  useResumeStrategyMutation: () => ({ mutate: resumeMutate, isPending: false }),
  useDeleteStrategyMutation: () => ({ mutate: deleteMutate, isPending: false }),
  useExecuteStrategyMutation: (_strategyId: string | undefined, onSuccess?: () => void | Promise<void>) => {
    executeSuccessHandler = onSuccess
    return { mutate: executeMutate, isPending: false }
  },
}))

vi.mock('sonner', () => ({
  toast: { success: toastSuccessMock, error: vi.fn() },
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
  beforeEach(() => {
    vi.clearAllMocks()
    executeSuccessHandler = undefined
  })

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

  it('shows a success toast and invalidates dependencies after resume', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(orderKeys.preview(strategy.id), { orders: [] })
    queryClient.setQueryData(statsKeys.summary(), { total: 1 })
    queryClient.setQueryData(tradeKeys.strategyCycleHistory(strategy.id, null), { content: [] })
    resumeMutate.mockImplementation((_strategy, options) => options.onSuccess())

    const { result } = renderHook(() => useManageStrategyMutations(), {
      wrapper: createWrapper(queryClient),
    })

    act(() => result.current.resume(strategy))
    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('전략을 재개했습니다')
      expect(queryClient.getQueryState(orderKeys.preview(strategy.id))?.isInvalidated).toBe(true)
      expect(queryClient.getQueryState(statsKeys.summary())?.isInvalidated).toBe(true)
      expect(queryClient.getQueryState(tradeKeys.strategyCycleHistory(strategy.id, null))?.isInvalidated).toBe(true)
    })
  })

  it('invalidates dependencies after execution succeeds', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(orderKeys.preview(strategy.id), { orders: [] })
    queryClient.setQueryData(statsKeys.summary(), { total: 1 })
    queryClient.setQueryData(tradeKeys.strategyCycleHistory(strategy.id, null), { content: [] })
    executeMutate.mockImplementation(() => executeSuccessHandler?.())

    const { result } = renderHook(() => useManageStrategyMutations({ strategyId: strategy.id }), {
      wrapper: createWrapper(queryClient),
    })

    act(() => result.current.execute())

    await waitFor(() => {
      expect(queryClient.getQueryState(orderKeys.preview(strategy.id))?.isInvalidated).toBe(true)
      expect(queryClient.getQueryState(statsKeys.summary())?.isInvalidated).toBe(true)
      expect(queryClient.getQueryState(tradeKeys.strategyCycleHistory(strategy.id, null))?.isInvalidated).toBe(true)
    })
  })

  it('navigates only after delete invalidates every dependent cache and shows its success toast', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const events: string[] = []
    vi.spyOn(queryClient, 'invalidateQueries').mockImplementation(async () => {
      events.push('invalidate')
    })
    deleteMutate.mockImplementation(async (_strategy, options) => options.onSuccess())
    const onDeleted = () => events.push('navigate')

    const { result } = renderHook(() => useManageStrategyMutations({ onDeleted }), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => result.current.remove(strategy))

    expect(toastSuccessMock).toHaveBeenCalledWith('전략이 삭제되었습니다')
    expect(events).toEqual(['invalidate', 'invalidate', 'invalidate', 'navigate'])
  })
})
