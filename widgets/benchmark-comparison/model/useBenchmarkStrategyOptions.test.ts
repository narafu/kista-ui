import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useBenchmarkStrategyOptions } from './useBenchmarkStrategyOptions'

vi.mock('@entities/strategy', () => ({
  useAllStrategiesQuery: () => ({
    data: [
      { id: 's1', accountId: 'toss' },
      { id: 's2', accountId: 'mock' },
      { id: 's3', accountId: 'meritz' },
    ],
  }),
}))
vi.mock('@entities/account', () => ({
  useAccountsQuery: () => ({
    data: [
      { id: 'toss', broker: 'TOSS' },
      { id: 'mock', broker: 'MOCK' },
      { id: 'meritz', broker: 'MERITZ' },
    ],
  }),
}))

describe('useBenchmarkStrategyOptions', () => {
  it('모의계좌 전략만 벤치마크 선택지에서 뺀다', () => {
    const { result } = renderHook(() => useBenchmarkStrategyOptions(true))
    expect(result.current.strategies.map((s) => s.id)).toEqual(['s1', 's3'])
  })
})
