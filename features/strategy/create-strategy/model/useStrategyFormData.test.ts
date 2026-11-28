import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useStrategyFormData } from './useStrategyFormData'

vi.mock('@entities/meta', async () => ({
  ...(await vi.importActual<typeof import('@entities/meta')>('@entities/meta')),
  useMeta: () => ({
    meta: {
      strategyTypes: [
        { code: 'INFINITE', availableTickers: ['TQQQ', 'SOXL'], enabled: true },
        { code: 'DCA', availableTickers: ['TQQQ', 'XYZ'], enabled: true },
        { code: 'VR', availableTickers: ['NOPE'], enabled: true },
        { code: 'PRIVACY', availableTickers: ['SOXL'], supportedBrokers: ['MERITZ', 'MOCK'], enabled: true },
        { code: 'DISABLED', availableTickers: ['TQQQ'], enabled: false },
      ],
      tickers: [
        { code: 'TQQQ' },
        { code: 'SOXL' },
        { code: 'XYZ' },
      ],
      brokers: [],
    },
    findStrategyType: vi.fn(),
    labelOf: (_category: string, code: string) => ({ PRIVACY: 'P', MERITZ: '메리츠증권' })[code] ?? code,
  }),
}))

describe('useStrategyFormData', () => {
  it('메타에 있는 티커를 쓸 수 있는 유형만 본다', () => {
    const { result } = renderHook(() => useStrategyFormData('MERITZ'))
    expect(result.current.enabledStrategyTypes).toEqual(['INFINITE', 'DCA', 'PRIVACY'])
  })

  it('계좌 증권사가 supportedBrokers에 없는 유형은 숨기고 안내 문구를 낸다(모의계좌는 문구에서 뺀다)', () => {
    const { result } = renderHook(() => useStrategyFormData('TOSS'))
    expect(result.current.enabledStrategyTypes).toEqual(['INFINITE', 'DCA'])
    expect(result.current.brokerRestrictionNotes).toEqual(['P 전략은 메리츠증권 계좌에서만 등록할 수 있습니다.'])
  })

  it('MOCK 계좌는 PRIVACY를 등록할 수 있다', () => {
    const { result } = renderHook(() => useStrategyFormData('MOCK'))
    expect(result.current.enabledStrategyTypes).toContain('PRIVACY')
    expect(result.current.brokerRestrictionNotes).toEqual([])
  })
})
