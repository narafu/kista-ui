import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useBenchmarkStrategyOptions } from './useBenchmarkStrategyOptions'

vi.mock('@entities/strategy', () => ({
  useAllStrategiesQuery: () => ({
    data: [
      { id: 's1', accountId: 'kis' },
      { id: 's2', accountId: 'mock' },
      { id: 's3', accountId: 'upbit' },
    ],
  }),
}))
vi.mock('@entities/account', () => ({
  useAccountsQuery: () => ({
    data: [
      { id: 'kis', broker: 'KIS' },
      { id: 'mock', broker: 'MOCK' },
      { id: 'upbit', broker: 'UPBIT' },
    ],
  }),
}))

describe('useBenchmarkStrategyOptions', () => {
  it('모의·코인 계좌 전략은 벤치마크 선택지에서 뺀다', () => {
    const { result } = renderHook(() => useBenchmarkStrategyOptions(true))
    expect(result.current.strategies.map((s) => s.id)).toEqual(['s1'])
  })
})
