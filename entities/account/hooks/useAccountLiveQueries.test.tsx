import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAccountPricesQuery } from './useAccountMarginQuery'
import { accountKeys } from '../model/queryKeys'

const { getPricesMock, useQueryMock } = vi.hoisted(() => ({
  getPricesMock: vi.fn(),
  useQueryMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(),
  useQuery: useQueryMock,
  useQueryClient: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

vi.mock('../api', () => ({
  createAccount: vi.fn(),
  deleteAccount: vi.fn(),
  getPrices: getPricesMock,
  testKisConnection: vi.fn(),
  updateAccount: vi.fn(),
}))

describe('account live query freshness and error handling', () => {
  it('keeps prices live and propagates request failures', async () => {
    const failure = new Error('price request failed')
    getPricesMock.mockRejectedValueOnce(failure)
    useQueryMock.mockReturnValue({ data: undefined })

    renderHook(() => useAccountPricesQuery('account-1', ['TQQQ', 'SPY']))

    const options = useQueryMock.mock.calls.at(-1)?.[0]
    expect(options).toEqual(expect.objectContaining({
      queryKey: accountKeys.prices('account-1', ['SPY', 'TQQQ']),
      staleTime: 0,
    }))
    await expect(options.queryFn()).rejects.toThrow(failure)
  })
})
