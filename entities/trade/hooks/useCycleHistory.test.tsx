import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAccountCycleHistoryQuery } from './useCycleHistory'
import type { CycleHistoryItem } from '../model/types'

const { getAccountCycleHistoryMock } = vi.hoisted(() => ({ getAccountCycleHistoryMock: vi.fn() }))

vi.mock('../api', () => ({
  getAccountCycleHistory: getAccountCycleHistoryMock,
  getStrategyCycleHistory: vi.fn(),
}))

const item = { createdAt: '2026-07-01T09:00:00Z', ticker: 'TSLA' } as CycleHistoryItem
const firstPage = { items: [item], nextCursor: 'c1', hasMore: true }

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const hook = renderHook(() => useAccountCycleHistoryQuery('account-1', {}), { wrapper })
  return { client, ...hook }
}

describe('useAccountCycleHistoryQuery', () => {
  it('keeps loaded pages instead of reporting an error when a refetch fails', async () => {
    getAccountCycleHistoryMock.mockResolvedValueOnce(firstPage)
    const { client, result } = setup()
    await waitFor(() => expect(result.current.cycleHistory).toHaveLength(1))

    getAccountCycleHistoryMock.mockRejectedValueOnce(new Error('boom'))
    await act(() => client.refetchQueries())

    expect(result.current.isError).toBe(false)
    expect(result.current.cycleHistory).toHaveLength(1)
  })

  it('reports a failed next page until the next attempt, even after another refetch succeeds', async () => {
    getAccountCycleHistoryMock.mockResolvedValueOnce(firstPage)
    const { client, result } = setup()
    await waitFor(() => expect(result.current.cycleHistory).toHaveLength(1))

    getAccountCycleHistoryMock.mockRejectedValueOnce(new Error('boom'))
    await act(() => result.current.fetchNextPage())
    expect(result.current.isFetchNextPageError).toBe(true)

    getAccountCycleHistoryMock.mockResolvedValueOnce(firstPage)
    await act(() => client.refetchQueries())
    expect(result.current.isFetchNextPageError).toBe(true)

    getAccountCycleHistoryMock.mockResolvedValueOnce({ items: [], nextCursor: null, hasMore: false })
    await act(() => result.current.fetchNextPage())
    expect(result.current.isFetchNextPageError).toBe(false)
  })
})
