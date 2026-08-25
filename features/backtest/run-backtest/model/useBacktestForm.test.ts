import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

const mutateMock = vi.fn()
const resetMock = vi.fn()

vi.mock('@entities/backtest', () => ({
  useBacktestMutation: () => ({ mutate: mutateMock, reset: resetMock, data: undefined, error: null, isPending: false }),
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
    resetMock.mockReset()
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

  it('예수금과 평단가·수량이 모두 없으면 제출을 막는다', async () => {
    const { useBacktestForm } = await import('./useBacktestForm')
    const { result } = renderHook(() => useBacktestForm())

    act(() => {
      result.current.setFrom('2026-01-01')
      result.current.setTo('2026-06-01')
      result.current.setDivisionCount(20)
    })

    expect(result.current.submitDisabledReason).toBe('예수금 또는 평단가·수량 중 하나는 입력하세요')
  })

  it('수량만 입력하고 평단가를 비우면 제출을 막는다', async () => {
    const { useBacktestForm } = await import('./useBacktestForm')
    const { result } = renderHook(() => useBacktestForm())

    act(() => {
      result.current.setFrom('2026-01-01')
      result.current.setTo('2026-06-01')
      result.current.setDivisionCount(20)
      result.current.setQuantity(10)
    })

    expect(result.current.submitDisabledReason).toBe('수량을 입력했다면 평단가도 입력하세요')
  })

  it('평단가·수량만으로도(예수금 0) 제출 가능하다', async () => {
    const { useBacktestForm } = await import('./useBacktestForm')
    const { result } = renderHook(() => useBacktestForm())

    act(() => {
      result.current.setFrom('2026-01-01')
      result.current.setTo('2026-06-01')
      result.current.setDivisionCount(20)
      result.current.setQuantity(10)
      result.current.setAvgPrice(87.5)
    })

    expect(result.current.submitDisabledReason).toBeNull()

    act(() => {
      result.current.run()
    })
    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ seed: 0, initialHoldings: 10, initialAvgPrice: 87.5 })
    )
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

  it('VR 인출 모드는 vrRecurringAmount를 음수로 변환해 mutate에 전달한다', async () => {
    const { useBacktestForm } = await import('./useBacktestForm')
    const { result } = renderHook(() => useBacktestForm())

    act(() => {
      result.current.setType('VR')
      result.current.setSeed(10000)
      result.current.setFrom('2026-01-01')
      result.current.setTo('2026-06-01')
      result.current.setVrBandWidth(15)
      result.current.setVrIntervalWeeks(4)
      result.current.setVrInitialValue(5000)
      result.current.setVrRecurringMode('WITHDRAW')
      result.current.setVrRecurringAmountAbs(500)
    })
    act(() => {
      result.current.run()
    })

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ vrRecurringAmount: -500 })
    )
  })

  it('reset()은 타입·기간·시드·VR 필드를 초기값으로 되돌리고 mutation 결과를 지운다', async () => {
    const { useBacktestForm } = await import('./useBacktestForm')
    const { result } = renderHook(() => useBacktestForm())

    act(() => {
      result.current.setType('VR')
      result.current.setFrom('2026-01-01')
      result.current.setTo('2026-06-01')
      result.current.setSeed(10000)
      result.current.setVrBandWidth(15)
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.type).toBe('INFINITE')
    expect(result.current.ticker).toBe('MAGX')
    expect(result.current.from).toBe('')
    expect(result.current.to).toBe('')
    expect(result.current.seed).toBeNull()
    expect(result.current.vrBandWidth).toBeNull()
    expect(resetMock).toHaveBeenCalled()
  })
})
