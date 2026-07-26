import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
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
  listAllStrategiesMock,
  listStrategiesMock,
  createStrategyMock,
  updateStrategyMock,
  deleteStrategyMock,
  pauseStrategyMock,
  resumeStrategyMock,
} = vi.hoisted(() => ({
  listAllStrategiesMock: vi.fn(),
  listStrategiesMock: vi.fn(),
  createStrategyMock: vi.fn(),
  updateStrategyMock: vi.fn(),
  deleteStrategyMock: vi.fn(),
  pauseStrategyMock: vi.fn(),
  resumeStrategyMock: vi.fn(),
}))

vi.mock('../api', () => ({
  listAllStrategies: listAllStrategiesMock,
  listStrategies: listStrategiesMock,
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

const strategyOtherAccount: Strategy = {
  ...strategyA,
  id: 'strategy-other',
  accountId: 'account-2',
  ticker: 'SOXL',
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

  it('materializes both complete cold lists before the create callback runs', async () => {
    const queryClient = createTestQueryClient()
    let resolveAll!: (strategies: Strategy[]) => void
    let resolveByAccount!: (strategies: Strategy[]) => void
    listAllStrategiesMock.mockReturnValue(new Promise<Strategy[]>((resolve) => {
      resolveAll = resolve
    }))
    listStrategiesMock.mockReturnValue(new Promise<Strategy[]>((resolve) => {
      resolveByAccount = resolve
    }))
    const callback = vi.fn()
    createStrategyMock.mockResolvedValue(strategyB)
    const create = renderHook(() => useCreateStrategyMutation('account-1', callback), {
      wrapper: createWrapper(queryClient),
    })

    const mutationPromise = create.result.current.mutateAsync({ type: 'INFINITE', cycleSeedType: 'MAX' })

    await waitFor(() => expect(createStrategyMock).toHaveBeenCalled())
    expect(callback).not.toHaveBeenCalled()
    resolveAll([strategyA, strategyB, strategyOtherAccount])
    await Promise.resolve()
    expect(callback).not.toHaveBeenCalled()
    resolveByAccount([strategyA, strategyB])
    await mutationPromise

    expect(queryClient.getQueryData(strategyKeys.listAll())).toEqual([strategyA, strategyB, strategyOtherAccount])
    expect(queryClient.getQueryData(strategyKeys.listByAccount('account-1'))).toEqual([strategyA, strategyB])
    expect(queryClient.getQueryData(strategyKeys.detail(strategyB.id))).toEqual(strategyB)
    expect(callback).toHaveBeenCalledOnce()
  })

  it('materializes complete cold lists after an update', async () => {
    const queryClient = createTestQueryClient()
    const saved = { ...strategyA, ticker: 'SOXL' }
    let allAtCallback: Strategy[] | undefined
    let accountAtCallback: Strategy[] | undefined
    listAllStrategiesMock.mockResolvedValue([saved, strategyB, strategyOtherAccount])
    listStrategiesMock.mockResolvedValue([saved, strategyB])
    updateStrategyMock.mockResolvedValue(saved)
    const update = renderHook(() => useUpdateStrategyMutation(strategyA.id, () => {
      allAtCallback = queryClient.getQueryData<Strategy[]>(strategyKeys.listAll())
      accountAtCallback = queryClient.getQueryData<Strategy[]>(strategyKeys.listByAccount('account-1'))
    }), {
      wrapper: createWrapper(queryClient),
    })

    await update.result.current.mutateAsync({ ticker: 'SOXL' })

    expect(queryClient.getQueryData(strategyKeys.listAll())).toEqual([saved, strategyB, strategyOtherAccount])
    expect(queryClient.getQueryData(strategyKeys.listByAccount('account-1'))).toEqual([saved, strategyB])
    expect(queryClient.getQueryData(strategyKeys.detail(strategyA.id))).toEqual(saved)
    expect(allAtCallback).toEqual([saved, strategyB, strategyOtherAccount])
    expect(accountAtCallback).toEqual([saved, strategyB])
  })

  it('materializes complete cold lists after a status change', async () => {
    const queryClient = createTestQueryClient()
    const paused = { ...strategyA, status: 'PAUSED' }
    listAllStrategiesMock.mockResolvedValue([paused, strategyB, strategyOtherAccount])
    listStrategiesMock.mockResolvedValue([paused, strategyB])
    pauseStrategyMock.mockResolvedValue(undefined)
    const pause = renderHook(() => usePauseStrategyMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await pause.result.current.mutateAsync(strategyA)

    expect(queryClient.getQueryData(strategyKeys.listAll())).toEqual([paused, strategyB, strategyOtherAccount])
    expect(queryClient.getQueryData(strategyKeys.listByAccount('account-1'))).toEqual([paused, strategyB])
    expect(queryClient.getQueryData(strategyKeys.detail(strategyA.id))).toEqual(paused)
  })

  it('materializes every remaining strategy after a cold delete', async () => {
    const queryClient = createTestQueryClient()
    listAllStrategiesMock.mockResolvedValue([strategyB, strategyOtherAccount])
    listStrategiesMock.mockResolvedValue([strategyB])
    deleteStrategyMock.mockResolvedValue(undefined)
    const remove = renderHook(() => useDeleteStrategyMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await remove.result.current.mutateAsync(strategyA)

    expect(queryClient.getQueryData(strategyKeys.listAll())).toEqual([strategyB, strategyOtherAccount])
    expect(queryClient.getQueryData(strategyKeys.listByAccount('account-1'))).toEqual([strategyB])
    expect(queryClient.getQueryData(strategyKeys.detail(strategyA.id))).toBeUndefined()
  })
})
