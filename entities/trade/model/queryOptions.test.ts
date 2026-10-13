import { describe, expect, it, vi } from 'vitest'

import { tradeKeys } from './queryKeys'
import { accountPortfolioQueryOptions } from './queryOptions'

const { getAccountPortfolioMock } = vi.hoisted(() => ({
  getAccountPortfolioMock: vi.fn(),
}))

vi.mock('../api', () => ({
  getAccountPortfolio: getAccountPortfolioMock,
}))

describe('trade query options', () => {
  it('keeps the portfolio key under tradeKeys.all so trade invalidation refreshes it', async () => {
    getAccountPortfolioMock.mockResolvedValue({ positions: [] })

    const options = accountPortfolioQueryOptions('account-1', 'server-token')
    if (!options.queryFn) throw new Error('portfolio query options require a query function')

    await options.queryFn({} as never)

    expect(options.queryKey).toEqual(tradeKeys.portfolio('account-1'))
    expect(options.queryKey.slice(0, tradeKeys.all.length)).toEqual([...tradeKeys.all])
    expect(getAccountPortfolioMock).toHaveBeenCalledWith('account-1', 'server-token')
  })
})
