import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { AdminPrivacyBase } from '../model/types'
import { privacyKeys } from '../model/queryKeys'
import { useCreateAdminPrivacyBaseMutation } from './usePrivacyMutations'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const { createAdminPrivacyBaseMock } = vi.hoisted(() => ({
  createAdminPrivacyBaseMock: vi.fn(),
}))

vi.mock('../api', () => ({
  createAdminPrivacyBase: createAdminPrivacyBaseMock,
}))

function base(overrides: Partial<AdminPrivacyBase>): AdminPrivacyBase {
  return {
    id: 'x',
    releaseDate: '2026-07-01',
    ticker: 'SOXL',
    currentCycleStart: 0,
    currentCycleRealizedPnl: 0,
    avgPrice: null,
    holdings: 0,
    orders: [],
    ...overrides,
  }
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useCreateAdminPrivacyBaseMutation', () => {
  it('keeps the list cache sorted by releaseDate DESC after inserting a new base', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const older = base({ id: 'older', releaseDate: '2026-06-01' })
    const newer = base({ id: 'newer', releaseDate: '2026-08-01' })
    queryClient.setQueryData(privacyKeys.list(), [newer, older])

    const created = base({ id: 'created', releaseDate: '2026-07-15' })
    createAdminPrivacyBaseMock.mockResolvedValue(created)

    const { result } = renderHook(() => useCreateAdminPrivacyBaseMutation(), {
      wrapper: createWrapper(queryClient),
    })

    result.current.mutate({
      releaseDate: created.releaseDate,
      ticker: created.ticker,
      currentCycleStart: 0,
      currentCycleRealizedPnl: 0,
      avgPrice: null,
      holdings: 0,
      orders: [],
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const cached = queryClient.getQueryData<AdminPrivacyBase[]>(privacyKeys.list())
    expect(cached?.map((b) => b.id)).toEqual(['newer', 'created', 'older'])
  })
})
