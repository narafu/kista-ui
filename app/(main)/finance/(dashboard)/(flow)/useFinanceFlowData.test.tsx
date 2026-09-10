import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useFinanceFlowData } from './useFinanceFlowData'

const { setPeriodMock, state } = vi.hoisted(() => ({
  setPeriodMock: vi.fn(),
  state: {
    userMonth: null as string | null,
    mode: 'monthly' as 'monthly' | 'yearly',
    transactions: [] as { transactionDate: string }[],
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
    useFinanceTransactionsQuery: (_from: string, _to: string, options?: { enabled?: boolean }) => ({
      data: options?.enabled === false ? [] : state.transactions,
      isLoading: false,
      isError: false,
    }),
    useFinanceCategoriesQuery: () => ({ data: [], isLoading: false }),
    useFinanceBudgetsQuery: () => ({ data: [] }),
  }
})

function seed(dates: string[]) {
  state.transactions = dates.map((transactionDate) => ({ transactionDate }))
}

describe('useFinanceFlowData 자동 월 조정', () => {
  beforeEach(() => {
    setPeriodMock.mockClear()
    state.userMonth = null
    state.mode = 'monthly'
    state.transactions = []
  })

  it('사용자 미선택 + 오늘 달에 거래 없으면 데이터 있는 최근 월을 표시하되 프로바이더는 건드리지 않는다', async () => {
    seed(['2026-07-05', '2026-08-20'])

    const { result } = renderHook(() => useFinanceFlowData('INCOME'))

    await waitFor(() => expect(result.current.period.month).toBe('2026-08'))
    // 회귀 방어: 자동 조정이 setPeriod(프로바이더 userMonth)를 쓰면 재평가가 다시 봉인되고 탭 전환에도 남는다
    expect(setPeriodMock).not.toHaveBeenCalled()
  })

  it('오늘 달에 거래가 생기면 조정하지 않고 오늘 달을 표시한다', async () => {
    seed(['2026-08-20', '2026-09-03'])

    const { result } = renderHook(() => useFinanceFlowData('INCOME'))

    await waitFor(() => expect(result.current.period.month).toBe('2026-09'))
    expect(setPeriodMock).not.toHaveBeenCalled()
  })

  it('사용자가 고른 월(userMonth)은 그 달에 거래가 없어도 유지한다', async () => {
    state.userMonth = '2026-08'
    seed(['2026-09-03'])

    const { result } = renderHook(() => useFinanceFlowData('INCOME'))

    await waitFor(() => expect(result.current.period.month).toBe('2026-08'))
    expect(setPeriodMock).not.toHaveBeenCalled()
  })

  it('최근 월에 데이터가 생긴 뒤 새로 마운트하면 그 최근 월로 재평가한다(봉인 해제)', async () => {
    seed(['2026-08-20'])
    const first = renderHook(() => useFinanceFlowData('INCOME'))
    await waitFor(() => expect(first.result.current.period.month).toBe('2026-08'))
    first.unmount()

    seed(['2026-08-20', '2026-09-04'])
    const second = renderHook(() => useFinanceFlowData('INCOME'))

    await waitFor(() => expect(second.result.current.period.month).toBe('2026-09'))
    expect(setPeriodMock).not.toHaveBeenCalled()
  })

  it('setPeriod는 프로바이더 setter로 그대로 전달된다', () => {
    const { result } = renderHook(() => useFinanceFlowData('INCOME'))

    act(() => result.current.setPeriod({ month: '2026-05', mode: 'monthly' }))

    expect(setPeriodMock).toHaveBeenCalledWith({ month: '2026-05', mode: 'monthly' })
  })
})
