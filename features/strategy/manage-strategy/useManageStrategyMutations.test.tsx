import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { accountKeys } from '@entities/account'
import { tradeKeys } from '@entities/trade'
import type { Strategy } from '@entities/strategy'
import { ApiError } from '@shared/lib/api-client'
import { useManageStrategyMutations } from './useManageStrategyMutations'

const pauseMutate = vi.fn()
const resumeMutate = vi.fn()
const deleteMutate = vi.fn()
const archiveMutate = vi.fn()
const { toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({ toastSuccessMock: vi.fn(), toastErrorMock: vi.fn() }))

vi.mock('@entities/strategy', () => ({
  usePauseStrategyMutation: () => ({ mutate: pauseMutate, isPending: false }),
  useResumeStrategyMutation: () => ({ mutate: resumeMutate, isPending: false }),
  useDeleteStrategyMutation: () => ({ mutate: deleteMutate, isPending: false }),
  useArchiveStrategyMutation: () => ({ mutate: archiveMutate, isPending: false }),
}))

vi.mock('sonner', () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}))

const strategy: Strategy = {
  id: 'strategy-1',
  accountId: 'account-1',
  type: 'INFINITE',
  status: 'ACTIVE',
  ticker: 'MAGX',
  cycleSeedType: 'MAX',
  initialDeposit: 1000,
  divisionCount: 20,
  isReverseMode: false,
  cycleInProgress: true,
  allowedActions: [],
  blockedActions: [],
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useManageStrategyMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('shows a toast, invalidates dependencies and then calls onArchived after archive', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(statsKeys.summary(), { total: 1 })
    archiveMutate.mockImplementation((_strategy, options) => options.onSuccess())
    const onArchived = vi.fn()

    const { result } = renderHook(() => useManageStrategyMutations({ onArchived }), {
      wrapper: createWrapper(queryClient),
    })

    act(() => result.current.archive(strategy))

    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith('전략을 보관했습니다')
      expect(queryClient.getQueryState(statsKeys.summary())?.isInvalidated).toBe(true)
      expect(onArchived).toHaveBeenCalled()
    })
  })

  it('navigates only after delete invalidates every dependent cache and shows its success toast', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const resolvers: Array<() => void> = []
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockImplementation(
      () => new Promise<void>((resolve) => {
        resolvers.push(resolve)
      }),
    )
    deleteMutate.mockImplementation((_strategy, options) => {
      void options.onSuccess()
    })
    const onDeleted = vi.fn()

    const { result } = renderHook(() => useManageStrategyMutations({ onDeleted }), {
      wrapper: createWrapper(queryClient),
    })

    act(() => result.current.remove(strategy))

    expect(toastSuccessMock).toHaveBeenCalledWith('전략을 삭제했습니다')
    expect(invalidate.mock.calls.map(([options]) => options)).toEqual([
      { queryKey: orderKeys.all },
      { queryKey: statsKeys.all },
      { queryKey: tradeKeys.all },
      { queryKey: accountKeys.ledgerTotalsRoot() },
    ])
    expect(onDeleted).not.toHaveBeenCalled()

    await act(async () => {
      resolvers.forEach((resolve) => resolve())
    })
    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce())
  })

  it('still navigates away after delete even if one dependent invalidation rejects', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    vi.spyOn(queryClient, 'invalidateQueries').mockRejectedValueOnce(new Error('stats refetch failed'))
    deleteMutate.mockImplementation((_strategy, options) => {
      void options.onSuccess()
    })
    const onDeleted = vi.fn()

    const { result } = renderHook(() => useManageStrategyMutations({ onDeleted }), {
      wrapper: createWrapper(queryClient),
    })

    act(() => result.current.remove(strategy))

    expect(toastSuccessMock).toHaveBeenCalledWith('전략을 삭제했습니다')
    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce())
  })

  it.each([
    ['resume', resumeMutate, '남은 원장($3.00)이 1주 가격($10.00)보다 작아 재개할 수 없습니다. 전략을 삭제한 뒤 충분한 투자금으로 다시 등록해야 합니다.'],
    ['archive', archiveMutate, '오늘 접수된 주문이 마감 반영된 뒤 보관할 수 있습니다.'],
  ] as const)('%s가 400으로 거절되면 서버 detail을 토스트 한 번으로 그대로 보여 준다', async (action, mutate, detail) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    mutate.mockImplementation((_strategy, options) => options.onError(new ApiError(400, { detail })))

    const { result } = renderHook(() => useManageStrategyMutations(), { wrapper: createWrapper(queryClient) })
    act(() => result.current[action](strategy))

    expect(toastErrorMock).toHaveBeenCalledOnce()
    expect(toastErrorMock).toHaveBeenCalledWith(detail)
  })
})
