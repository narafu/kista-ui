import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { Strategy } from '../model/types'
import { strategyKeys } from '../model/queryKeys'
import {
  useCreateStrategyMutation,
  useDeleteStrategyMutation,
  usePauseStrategyMutation,
  useResumeStrategyMutation,
  useUpdateStrategyMutation,
} from './useStrategyQueries'

const {
  createStrategyMock,
  updateStrategyMock,
  deleteStrategyMock,
  pauseStrategyMock,
  resumeStrategyMock,
} = vi.hoisted(() => ({
  createStrategyMock: vi.fn(),
  updateStrategyMock: vi.fn(),
  deleteStrategyMock: vi.fn(),
  pauseStrategyMock: vi.fn(),
  resumeStrategyMock: vi.fn(),
}))

vi.mock('../api', () => ({
  listAllStrategies: vi.fn(),
  listStrategies: vi.fn(),
  createStrategy: createStrategyMock,
  updateStrategy: updateStrategyMock,
  deleteStrategy: deleteStrategyMock,
  pauseStrategy: pauseStrategyMock,
  resumeStrategy: resumeStrategyMock,
  executeStrategy: vi.fn(),
  getStrategySeedPreview: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

const strategyA: Strategy = {
  id: 'strategy-a',
  accountId: 'account-1',
  type: 'INFINITE',
  status: 'ACTIVE',
  ticker: 'MAGX',
  cycleSeedType: 'MAX',
  initialUsdDeposit: 1000,
  divisionCount: 20,
  isReverseMode: false,
}

const strategyB: Strategy = {
  ...strategyA,
  id: 'strategy-b',
  ticker: 'TQQQ',
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function seedStrategyLists(queryClient: QueryClient, strategies: Strategy[]) {
  queryClient.setQueryData(strategyKeys.listAll(), strategies)
  queryClient.setQueryData(strategyKeys.listByAccount('account-1'), strategies)
}

describe('strategy mutations', () => {
  it('adds a created strategy to all and account lists', async () => {
    const queryClient = createTestQueryClient()
    seedStrategyLists(queryClient, [strategyA])
    createStrategyMock.mockResolvedValue(strategyB)

    const { result } = renderHook(() => useCreateStrategyMutation('account-1'), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync({ type: 'INFINITE', cycleSeedType: 'MAX' })

    expect(queryClient.getQueryData(strategyKeys.listAll())).toEqual([strategyA, strategyB])
    expect(queryClient.getQueryData(strategyKeys.listByAccount('account-1'))).toEqual([strategyA, strategyB])
  })

  it('replaces an updated strategy in all and account lists', async () => {
    const queryClient = createTestQueryClient()
    const saved = { ...strategyA, ticker: 'SOXL' }
    seedStrategyLists(queryClient, [strategyA, strategyB])
    updateStrategyMock.mockResolvedValue(saved)

    const { result } = renderHook(() => useUpdateStrategyMutation(strategyA.id), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync({ ticker: 'SOXL' })

    expect(queryClient.getQueryData(strategyKeys.listAll())).toEqual([saved, strategyB])
    expect(queryClient.getQueryData(strategyKeys.listByAccount('account-1'))).toEqual([saved, strategyB])
  })

  it('changes pause and resume status in both lists', async () => {
    const queryClient = createTestQueryClient()
    seedStrategyLists(queryClient, [strategyA])
    pauseStrategyMock.mockResolvedValue(undefined)
    resumeStrategyMock.mockResolvedValue(undefined)

    const pause = renderHook(() => usePauseStrategyMutation(), {
      wrapper: createWrapper(queryClient),
    })
    await pause.result.current.mutateAsync(strategyA)

    const paused = { ...strategyA, status: 'PAUSED' }
    expect(queryClient.getQueryData(strategyKeys.listAll())).toEqual([paused])
    expect(queryClient.getQueryData(strategyKeys.listByAccount('account-1'))).toEqual([paused])

    const resume = renderHook(() => useResumeStrategyMutation(), {
      wrapper: createWrapper(queryClient),
    })
    await resume.result.current.mutateAsync(paused)

    expect(queryClient.getQueryData(strategyKeys.listAll())).toEqual([strategyA])
    expect(queryClient.getQueryData(strategyKeys.listByAccount('account-1'))).toEqual([strategyA])
  })

  it('removes a deleted strategy from both lists', async () => {
    const queryClient = createTestQueryClient()
    seedStrategyLists(queryClient, [strategyA, strategyB])
    deleteStrategyMock.mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteStrategyMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync(strategyA)

    expect(queryClient.getQueryData(strategyKeys.listAll())).toEqual([strategyB])
    expect(queryClient.getQueryData(strategyKeys.listByAccount('account-1'))).toEqual([strategyB])
  })

  it('does not fabricate unloaded list caches after strategy mutations', async () => {
    const createClient = createTestQueryClient()
    const createInvalidate = vi.spyOn(createClient, 'invalidateQueries')
    createStrategyMock.mockResolvedValue(strategyB)
    const create = renderHook(() => useCreateStrategyMutation('account-1'), {
      wrapper: createWrapper(createClient),
    })

    await create.result.current.mutateAsync({ type: 'INFINITE', cycleSeedType: 'MAX' })

    expect(createClient.getQueryData(strategyKeys.listAll())).toBeUndefined()
    expect(createClient.getQueryData(strategyKeys.listByAccount('account-1'))).toBeUndefined()
    expect(createInvalidate).toHaveBeenCalledWith({ queryKey: strategyKeys.listAll() })
    expect(createInvalidate).toHaveBeenCalledWith({ queryKey: strategyKeys.listByAccount('account-1') })

    const pauseClient = createTestQueryClient()
    const pauseInvalidate = vi.spyOn(pauseClient, 'invalidateQueries')
    pauseStrategyMock.mockResolvedValue(undefined)
    const pause = renderHook(() => usePauseStrategyMutation(), {
      wrapper: createWrapper(pauseClient),
    })

    await pause.result.current.mutateAsync(strategyA)

    expect(pauseClient.getQueryData(strategyKeys.listAll())).toBeUndefined()
    expect(pauseClient.getQueryData(strategyKeys.listByAccount('account-1'))).toBeUndefined()
    expect(pauseInvalidate).toHaveBeenCalledWith({ queryKey: strategyKeys.listAll() })
    expect(pauseInvalidate).toHaveBeenCalledWith({ queryKey: strategyKeys.listByAccount('account-1') })

    const deleteClient = createTestQueryClient()
    const deleteInvalidate = vi.spyOn(deleteClient, 'invalidateQueries')
    deleteStrategyMock.mockResolvedValue(undefined)
    const remove = renderHook(() => useDeleteStrategyMutation(), {
      wrapper: createWrapper(deleteClient),
    })

    await remove.result.current.mutateAsync(strategyA)

    expect(deleteClient.getQueryData(strategyKeys.listAll())).toBeUndefined()
    expect(deleteClient.getQueryData(strategyKeys.listByAccount('account-1'))).toBeUndefined()
    expect(deleteInvalidate).toHaveBeenCalledWith({ queryKey: strategyKeys.listAll() })
    expect(deleteInvalidate).toHaveBeenCalledWith({ queryKey: strategyKeys.listByAccount('account-1') })
  })
})
