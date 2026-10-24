import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAccountPricesQuery } from '@entities/account'
import { useStrategyFormData } from './useStrategyFormData'

vi.mock('@entities/account', () => ({
  useAccountPricesQuery: vi.fn(() => ({ data: undefined, isError: false })),
}))
vi.mock('@entities/runtime-config', () => ({ useRuntimeConfigQuery: () => ({ data: { strategies: { INFINITE: { enabled: true }, DCA: { enabled: true } } } }) }))
vi.mock('@entities/meta', async () => ({
  ...(await vi.importActual<typeof import('@entities/meta')>('@entities/meta')),
  useMeta: () => ({
    meta: {
      strategyTypes: [
        { code: 'INFINITE', availableTickers: ['TQQQ', 'SOXL'] },
        { code: 'DCA', availableTickers: ['TQQQ', 'BTC'] },
      ],
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
  })

  it('업비트 계좌는 시세 조회를 막는다', () => {
    renderHook(() => useStrategyFormData('a1', 'UPBIT'))
    expect(useAccountPricesQuery).toHaveBeenCalledWith('a1', expect.any(Array), { enabled: false })
  })

  it('업비트 계좌는 코인 티커를 쓸 수 있는 전략 유형만 활성으로 본다', () => {
    const { result } = renderHook(() => useStrategyFormData('a1', 'UPBIT'))
    expect(result.current.enabledStrategyTypes).toEqual(['DCA'])
  })

  it('주식 계좌는 주식 티커를 쓸 수 있는 유형을 모두 본다', () => {
    const { result } = renderHook(() => useStrategyFormData('a1', 'KIS'))
    expect(result.current.enabledStrategyTypes).toEqual(['INFINITE', 'DCA'])
  })
})
