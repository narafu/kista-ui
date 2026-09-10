import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useFinanceFlowData } from './useFinanceFlowData'

const { replaceMock, state } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  state: { search: new URLSearchParams(), transactions: [] as { transactionDate: string }[] },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/finance/income',
  useSearchParams: () => state.search,
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
    replaceMock.mockClear()
    state.search = new URLSearchParams()
    state.transactions = []
  })

  it('?month= 없고 오늘 달에 거래가 없으면 데이터 있는 최근 월로 표시하되 URL은 건드리지 않는다', async () => {
    seed(['2026-07-05', '2026-08-20'])

    const { result } = renderHook(() => useFinanceFlowData('INCOME'))

    await waitFor(() => expect(result.current.period.month).toBe('2026-08'))
    // 회귀 방어: 자동 조정이 router.replace로 URL에 ?month=를 박으면 새로고침 시 재평가가 봉인된다
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('오늘 달에 거래가 생기면 조정하지 않고 오늘 달을 표시한다', async () => {
    seed(['2026-08-20', '2026-09-03'])

    const { result } = renderHook(() => useFinanceFlowData('INCOME'))

    await waitFor(() => expect(result.current.period.month).toBe('2026-09'))
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('?month=로 지정된 월은 그 달에 거래가 없어도 유지한다', async () => {
    state.search = new URLSearchParams('month=2026-08')
    seed(['2026-09-03'])

    const { result } = renderHook(() => useFinanceFlowData('INCOME'))

    await waitFor(() => expect(result.current.period.month).toBe('2026-08'))
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('최근 월에 데이터가 생긴 뒤 새로 마운트하면 그 최근 월로 재평가한다(봉인 해제)', async () => {
    seed(['2026-08-20'])
    const first = renderHook(() => useFinanceFlowData('INCOME'))
    await waitFor(() => expect(first.result.current.period.month).toBe('2026-08'))
    first.unmount()

    seed(['2026-08-20', '2026-09-04'])
    const second = renderHook(() => useFinanceFlowData('INCOME'))

    await waitFor(() => expect(second.result.current.period.month).toBe('2026-09'))
    expect(replaceMock).not.toHaveBeenCalled()
  })

  it('사용자가 setPeriod로 월을 직접 고르면 URL에 기록한다', () => {
    const { result } = renderHook(() => useFinanceFlowData('INCOME'))

    act(() => result.current.setPeriod({ month: '2026-05', mode: 'monthly' }))

    expect(replaceMock).toHaveBeenCalledWith('/finance/income?month=2026-05')
  })
})
