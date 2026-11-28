import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { financeKeys } from '../model/queryKeys'
import { useFinanceTransactionsInfiniteQuery } from './useFinanceTransactionsInfiniteQuery'

const { useInfiniteQueryMock } = vi.hoisted(() => ({
  useInfiniteQueryMock: vi.fn((_options: unknown) => ({ data: undefined, fetchNextPage: vi.fn() })),
}))

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query')
  return { ...actual, useInfiniteQuery: useInfiniteQueryMock }
})

vi.mock('../api', () => ({ listFinanceTransactions: vi.fn() }))

describe('useFinanceTransactionsInfiniteQuery', () => {
  it('조회 조건을 키에 싣고, hasMore가 false면 다음 페이지 커서를 만들지 않는다', () => {
    const params = { from: '2026-08-01', to: '2026-08-31', sort: 'transactionDate,desc' }
    renderHook(() => useFinanceTransactionsInfiniteQuery(params))

    const options = useInfiniteQueryMock.mock.calls[0][0] as {
      queryKey: unknown
      getNextPageParam: (last: { items: []; nextCursor?: string | null; hasMore: boolean }) => string | undefined
    }
    expect(options.queryKey).toEqual(financeKeys.transactions(params))
    expect(options.getNextPageParam({ items: [], nextCursor: 'c1', hasMore: true })).toBe('c1')
    expect(options.getNextPageParam({ items: [], nextCursor: 'c1', hasMore: false })).toBeUndefined()
  })
})
