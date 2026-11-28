import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useFinanceFlowData } from './useFinanceFlowData'

const { setPeriodMock, state } = vi.hoisted(() => ({
  setPeriodMock: vi.fn(),
  state: {
    userMonth: null as string | null,
    mode: 'monthly' as 'monthly' | 'yearly',
    latestDate: null as string | null,
    latestLoading: false,
    latestArgs: null as unknown,
  },
}))

vi.mock('../FinancePeriodProvider', () => ({
  useFinancePeriod: () => ({
    userMonth: state.userMonth,
    mode: state.mode,
    setPeriod: setPeriodMock,
    setMonth: vi.fn(),
  }),
}))

vi.mock('@shared/lib/format', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@shared/lib/format')>()),
  todayKst: () => '2026-09-11',
}))

vi.mock('@entities/finance', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@entities/finance')>()
  return {
    ...actual,
    useLatestTransactionDateQuery: (args: { enabled?: boolean }) => {
      state.latestArgs = args
      return state.latestLoading
        ? { data: undefined, isLoading: true }
        : { data: state.latestDate, isLoading: false }
    },
    useFinanceCategoriesQuery: () => ({ data: [], isLoading: false }),
  }
})

// 최신 거래일 1건 조회 결과(오늘 기준 12개월 안에서 가장 늦은 거래일)
function seed(latest: string | null) {
  state.latestDate = latest
}

describe('useFinanceFlowData 기간 확정 대기', () => {
  beforeEach(() => {
    state.userMonth = null
    state.mode = 'monthly'
    state.latestDate = null
    state.latestLoading = true
  })

  it('사용자 미선택 월간 모드에서 최신 거래 조회 중이면 기간 미확정(집계 위젯 로딩)으로 본다', () => {
    const { result } = renderHook(() => useFinanceFlowData('INCOME'))
    expect(result.current.isPeriodPending).toBe(true)
  })

  it('사용자가 월을 골랐거나 연간 모드면 보정이 없어 기다리지 않는다', () => {
    state.userMonth = '2026-08'
    expect(renderHook(() => useFinanceFlowData('INCOME')).result.current.isPeriodPending).toBe(false)
    state.userMonth = null
    state.mode = 'yearly'
    expect(renderHook(() => useFinanceFlowData('INCOME')).result.current.isPeriodPending).toBe(false)
  })
})

describe('useFinanceFlowData 자동 월 조정', () => {
  beforeEach(() => {
    setPeriodMock.mockClear()
    state.userMonth = null
    state.mode = 'monthly'
    state.latestDate = null
    state.latestLoading = false
  })

  it('사용자 미선택 + 오늘 달에 거래 없으면 데이터 있는 최근 월을 표시하되 프로바이더는 건드리지 않는다', async () => {
    seed('2026-08-20')

    const { result } = renderHook(() => useFinanceFlowData('INCOME'))

    await waitFor(() => expect(result.current.period.month).toBe('2026-08'))
    // 회귀 방어: 자동 조정이 setPeriod(프로바이더 userMonth)를 쓰면 재평가가 다시 봉인되고 탭 전환에도 남는다
    expect(setPeriodMock).not.toHaveBeenCalled()
  })

  it('한 번 보정된 달은 이후 최신 거래일이 바뀌어도(새 거래 등록 → 재조회) 유지한다', async () => {
    seed('2026-08-20')
    const { result, rerender } = renderHook(() => useFinanceFlowData('INCOME'))
    await waitFor(() => expect(result.current.period.month).toBe('2026-08'))

    seed('2026-09-03')
    rerender()

    expect(result.current.period.month).toBe('2026-08')
    expect(result.current.isPeriodPending).toBe(false)
    expect(state.latestArgs).toMatchObject({ enabled: false })
  })

  it('보정이 필요하면 첫 커밋 렌더부터 보정된 달이다(집계 위젯이 오늘 달로 먼저 조회하지 않음)', () => {
    seed('2026-08-20')

    // 위젯은 isPeriodPending이 false인 렌더에서만 집계를 조회한다 — 그런 렌더가 오늘 달(2026-09)이면 안 된다.
    const settledMonths: string[] = []
    const { result } = renderHook(() => {
      const data = useFinanceFlowData('INCOME')
      if (!data.isPeriodPending) settledMonths.push(data.period.month)
      return data
    })

    expect(result.current.period.month).toBe('2026-08')
    expect(settledMonths).not.toContain('2026-09')
  })

  it('오늘 달에 거래가 생기면 조정하지 않고 오늘 달을 표시한다', async () => {
    seed('2026-09-03')

    const { result } = renderHook(() => useFinanceFlowData('INCOME'))

    await waitFor(() => expect(result.current.period.month).toBe('2026-09'))
    expect(setPeriodMock).not.toHaveBeenCalled()
  })

  it('사용자가 고른 월(userMonth)은 그 달에 거래가 없어도 유지한다', async () => {
    state.userMonth = '2026-08'
    seed('2026-09-03')

    const { result } = renderHook(() => useFinanceFlowData('INCOME'))

    await waitFor(() => expect(result.current.period.month).toBe('2026-08'))
    expect(setPeriodMock).not.toHaveBeenCalled()
  })

  it('최근 월에 데이터가 생긴 뒤 새로 마운트하면 그 최근 월로 재평가한다(봉인 해제)', async () => {
    seed('2026-08-20')
    const first = renderHook(() => useFinanceFlowData('INCOME'))
    await waitFor(() => expect(first.result.current.period.month).toBe('2026-08'))
    first.unmount()

    seed('2026-09-04')
    const second = renderHook(() => useFinanceFlowData('INCOME'))

    await waitFor(() => expect(second.result.current.period.month).toBe('2026-09'))
    expect(setPeriodMock).not.toHaveBeenCalled()
  })

  it('자동 보정 조회는 월 미선택 월간 모드에서만 켜진다', () => {
    renderHook(() => useFinanceFlowData('INCOME'))
    expect(state.latestArgs).toMatchObject({ from: '2025-10-01', to: '2026-09-30', enabled: true })

    state.userMonth = '2026-08'
    renderHook(() => useFinanceFlowData('INCOME'))
    expect(state.latestArgs).toMatchObject({ enabled: false })
  })

  it('setPeriod는 프로바이더 setter로 그대로 전달된다', () => {
    const { result } = renderHook(() => useFinanceFlowData('INCOME'))

    act(() => result.current.setPeriod({ month: '2026-05', mode: 'monthly' }))

    expect(setPeriodMock).toHaveBeenCalledWith({ month: '2026-05', mode: 'monthly' })
  })
})
