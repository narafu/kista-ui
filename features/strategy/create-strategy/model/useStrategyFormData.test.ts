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
        { code: 'DCA', availableTickers: ['TQQQ', 'XYZ'] },
      ],
      tickers: [
        { code: 'TQQQ', market: 'US_STOCK' },
        { code: 'SOXL' },
        { code: 'XYZ', market: 'OTHER' },
      ],
    },
    findStrategyType: vi.fn(),
  }),
}))

describe('useStrategyFormData', () => {
  beforeEach(() => vi.clearAllMocks())

  it('주식 외 시장 티커는 빼고 시세를 조회한다', () => {
    renderHook(() => useStrategyFormData('a1', 'TOSS'))
    expect(useAccountPricesQuery).toHaveBeenCalledWith('a1', ['TQQQ', 'SOXL'])
  })

  it('주식 계좌는 주식 티커를 쓸 수 있는 유형을 모두 본다', () => {
    const { result } = renderHook(() => useStrategyFormData('a1', 'TOSS'))
    expect(result.current.enabledStrategyTypes).toEqual(['INFINITE', 'DCA'])
  })
})
