import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAccountPricesQuery } from '@entities/account'
import { useStrategyFormData } from './useStrategyFormData'

vi.mock('@entities/account', () => ({
  useAccountPricesQuery: vi.fn(() => ({ data: undefined, isError: false })),
}))
vi.mock('@entities/runtime-config', () => ({ useRuntimeConfigQuery: () => ({ data: { strategies: { INFINITE: { enabled: true }, DCA: { enabled: true }, VR: { enabled: true } } } }) }))
vi.mock('@entities/meta', async () => ({
  ...(await vi.importActual<typeof import('@entities/meta')>('@entities/meta')),
  useMeta: () => ({
    meta: {
      strategyTypes: [
        { code: 'INFINITE', availableTickers: ['TQQQ', 'SOXL'] },
        { code: 'DCA', availableTickers: ['TQQQ', 'XYZ'] },
        { code: 'VR', availableTickers: ['NOPE'] },
      ],
      tickers: [
        { code: 'TQQQ' },
        { code: 'SOXL' },
        { code: 'XYZ' },
      ],
    },
    findStrategyType: vi.fn(),
  }),
}))

describe('useStrategyFormData', () => {
  beforeEach(() => vi.clearAllMocks())

  it('메타 티커 전체의 시세를 조회한다', () => {
    renderHook(() => useStrategyFormData('a1', 'TOSS'))
    expect(useAccountPricesQuery).toHaveBeenCalledWith('a1', ['TQQQ', 'SOXL', 'XYZ'])
  })

  it('메타에 있는 티커를 쓸 수 있는 유형만 본다', () => {
    const { result } = renderHook(() => useStrategyFormData('a1', 'TOSS'))
    expect(result.current.enabledStrategyTypes).toEqual(['INFINITE', 'DCA'])
  })
})
