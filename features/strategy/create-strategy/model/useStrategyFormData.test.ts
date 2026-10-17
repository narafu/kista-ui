import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAccountMarginQuery, useAccountPricesQuery } from '@entities/account'
import { useStrategyFormData } from './useStrategyFormData'

vi.mock('@entities/account', () => ({
  useAccountMarginQuery: vi.fn(() => ({ items: [], isLoading: false, isError: false })),
  useAccountPricesQuery: vi.fn(() => ({ data: undefined, isError: false })),
}))
vi.mock('@entities/user', () => ({ useMeQuery: () => ({ data: { balanceCheckEnabled: true } }) }))
vi.mock('@entities/runtime-config', () => ({ useRuntimeConfigQuery: () => ({ data: { strategies: {} } }) }))
vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    meta: {
      strategyTypes: [],
      tickers: [
        { code: 'TQQQ', market: 'US_STOCK' },
        { code: 'SOXL' },
        { code: 'BTC', market: 'CRYPTO_KRW' },
      ],
    },
    findStrategyType: vi.fn(),
  }),
}))

describe('useStrategyFormData', () => {
  beforeEach(() => vi.clearAllMocks())

  it('주식 계좌는 코인 티커를 빼고 시세를 조회한다', () => {
    renderHook(() => useStrategyFormData('a1', 'KIS'))
    expect(useAccountPricesQuery).toHaveBeenCalledWith('a1', ['TQQQ', 'SOXL'], { enabled: true })
    expect(useAccountMarginQuery).toHaveBeenCalledWith('a1', { enabled: true })
  })

  it('업비트 계좌는 예수금·시세 조회를 막는다', () => {
    renderHook(() => useStrategyFormData('a1', 'UPBIT'))
    expect(useAccountMarginQuery).toHaveBeenCalledWith('a1', { enabled: false })
    expect(useAccountPricesQuery).toHaveBeenCalledWith('a1', expect.any(Array), { enabled: false })
  })
})
