import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

const mutateMock = vi.fn()

vi.mock('@entities/backtest', () => ({
  useBacktestMutation: () => ({ mutate: mutateMock, data: undefined, error: null, isPending: false }),
}))

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    meta: {
      strategyTypes: [
        { code: 'INFINITE', availableTickers: ['MAGX', 'USD', 'TQQQ', 'SOXL'], divisionCounts: [20, 30, 40] },
        { code: 'PRIVACY', availableTickers: ['SOXL'], divisionCounts: [] },
        { code: 'VR', availableTickers: ['TQQQ'], divisionCounts: [] },
      ],
    },
  }),
}))

describe('useBacktestForm', () => {
  beforeEach(() => {
    mutateMock.mockReset()
  })

  it('전략 타입 전환 시 종목·VR 필드가 새 타입 기본값으로 초기화된다', async () => {
    const { useBacktestForm } = await import('./useBacktestForm')
    const { result } = renderHook(() => useBacktestForm())

    act(() => {
      result.current.setVrBandWidth(15)
    })
    act(() => {
      result.current.setType('VR')
    })

    expect(result.current.ticker).toBe('TQQQ')
    expect(result.current.vrBandWidth).toBeNull()
  })

  it('시드가 없으면 제출을 막는다', async () => {
    const { useBacktestForm } = await import('./useBacktestForm')
    const { result } = renderHook(() => useBacktestForm())

    act(() => {
      result.current.setFrom('2026-01-01')
      result.current.setTo('2026-06-01')
      result.current.setDivisionCount(20)
    })

    expect(result.current.submitDisabledReason).toBe('시드는 0보다 커야 합니다')
  })

  it('시작일이 종료일보다 늦으면 제출을 막는다', async () => {
    const { useBacktestForm } = await import('./useBacktestForm')
    const { result } = renderHook(() => useBacktestForm())

    act(() => {
      result.current.setSeed(10000)
      result.current.setDivisionCount(20)
      result.current.setFrom('2026-06-01')
      result.current.setTo('2026-01-01')
    })

    expect(result.current.submitDisabledReason).toBe('시작일이 종료일보다 늦을 수 없습니다')
  })

  it('VR은 밴드폭·주기·초기V값이 모두 있어야 제출 가능하다', async () => {
    const { useBacktestForm } = await import('./useBacktestForm')
    const { result } = renderHook(() => useBacktestForm())

    act(() => {
      result.current.setType('VR')
      result.current.setSeed(10000)
      result.current.setFrom('2026-01-01')
      result.current.setTo('2026-06-01')
    })
    expect(result.current.submitDisabledReason).toBe('VR 밴드 폭은 0보다 커야 합니다')

    act(() => {
      result.current.setVrBandWidth(15)
      result.current.setVrIntervalWeeks(4)
    })
    expect(result.current.submitDisabledReason).toBe('VR 초기 V값은 0보다 커야 합니다')

    act(() => {
      result.current.setVrInitialValue(5000)
    })
    expect(result.current.submitDisabledReason).toBeNull()
  })

  it('run()은 유효할 때만 mutate를 호출한다', async () => {
    const { useBacktestForm } = await import('./useBacktestForm')
    const { result } = renderHook(() => useBacktestForm())

    act(() => {
      result.current.run()
    })
    expect(mutateMock).not.toHaveBeenCalled()

    act(() => {
      result.current.setSeed(10000)
      result.current.setFrom('2026-01-01')
      result.current.setTo('2026-06-01')
      result.current.setDivisionCount(20)
    })
    act(() => {
      result.current.run()
    })
    expect(mutateMock).toHaveBeenCalledWith({
      type: 'INFINITE',
      ticker: 'MAGX',
      from: '2026-01-01',
      to: '2026-06-01',
      seed: 10000,
      divisionCount: 20,
      vrBandWidth: undefined,
      vrIntervalWeeks: undefined,
      vrRecurringAmount: undefined,
      vrInitialValue: undefined,
    })
  })
})
