import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { Account } from '../model/types'
import { accountKeys } from '../model/queryKeys'
import {
  useCreateAccountMutation,
  useDeleteAccountMutation,
  useUpdateAccountMutation,
} from './useAccountMarginQuery'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const pushMock = vi.fn()
const refreshMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}))

const {
  createAccountMock,
  updateAccountMock,
  deleteAccountMock,
} = vi.hoisted(() => ({
  createAccountMock: vi.fn(),
  updateAccountMock: vi.fn(),
  deleteAccountMock: vi.fn(),
}))

vi.mock('../api', () => ({
  createAccount: createAccountMock,
  updateAccount: updateAccountMock,
  deleteAccount: deleteAccountMock,
  getMargin: vi.fn(),
  getPrices: vi.fn(),
  testKisConnection: vi.fn(),
}))

const accountA: Account = {
  id: 'account-a',
  nickname: 'A',
  accountNoMasked: '111-***',
  broker: 'MOCK',
}

const accountB: Account = {
  id: 'account-b',
  nickname: 'B',
  accountNoMasked: '222-***',
  broker: 'MOCK',
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

describe('account mutations', () => {
  it('inserts a created account before feature navigation', async () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(accountKeys.list(), [accountA])
    createAccountMock.mockResolvedValue(accountB)

    const { result } = renderHook(() => useCreateAccountMutation(), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync({ nickname: 'B', broker: 'MOCK' })

    expect(queryClient.getQueryData(accountKeys.list())).toEqual([accountA, accountB])
  })

  it('replaces an updated account in list and detail caches', async () => {
    const queryClient = createTestQueryClient()
    const updated = { ...accountA, nickname: 'A edited' }
    queryClient.setQueryData(accountKeys.list(), [accountA, accountB])
    queryClient.setQueryData(accountKeys.detail(accountA.id), accountA)
    updateAccountMock.mockResolvedValue(updated)

    const { result } = renderHook(() => useUpdateAccountMutation(accountA.id), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync({ nickname: 'A edited' })

    expect(queryClient.getQueryData(accountKeys.list())).toEqual([updated, accountB])
    expect(queryClient.getQueryData(accountKeys.detail(accountA.id))).toEqual(updated)
  })

  it('removes a deleted account and its detail queries', async () => {
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(accountKeys.list(), [accountA, accountB])
    queryClient.setQueryData(accountKeys.detail(accountA.id), accountA)
    queryClient.setQueryData(accountKeys.margin(accountA.id), [{ currency: 'USD' }])
    deleteAccountMock.mockResolvedValue(undefined)

    const { result } = renderHook(() => useDeleteAccountMutation(accountA.id), {
      wrapper: createWrapper(queryClient),
    })

    await result.current.mutateAsync()

    expect(queryClient.getQueryData(accountKeys.list())).toEqual([accountB])
    expect(queryClient.getQueryData(accountKeys.detail(accountA.id))).toBeUndefined()
    expect(queryClient.getQueryData(accountKeys.margin(accountA.id))).toBeUndefined()
  })

  it('does not call router.push or router.refresh inside entity mutations', async () => {
    const queryClient = createTestQueryClient()
    createAccountMock.mockResolvedValue(accountA)
    updateAccountMock.mockResolvedValue(accountA)
    deleteAccountMock.mockResolvedValue(undefined)

    const create = renderHook(() => useCreateAccountMutation(), {
      wrapper: createWrapper(queryClient),
    })
    const update = renderHook(() => useUpdateAccountMutation(accountA.id), {
      wrapper: createWrapper(queryClient),
    })
    const remove = renderHook(() => useDeleteAccountMutation(accountA.id), {
      wrapper: createWrapper(queryClient),
    })

    await create.result.current.mutateAsync({ nickname: 'A', broker: 'MOCK' })
    await update.result.current.mutateAsync({ nickname: 'A' })
    await remove.result.current.mutateAsync()

    expect(pushMock).not.toHaveBeenCalled()
    expect(refreshMock).not.toHaveBeenCalled()
  })
})
