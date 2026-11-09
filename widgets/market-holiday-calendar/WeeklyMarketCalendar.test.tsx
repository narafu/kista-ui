import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { WeeklyMarketCalendar } from './WeeklyMarketCalendar'

const { useMonthlyHolidaysQueryMock, useAccountsQueryMock } = vi.hoisted(() => ({
  useMonthlyHolidaysQueryMock: vi.fn(),
  useAccountsQueryMock: vi.fn(),
}))

vi.mock('@entities/market', () => ({
  useMonthlyHolidaysQuery: (year: number, month: number) => useMonthlyHolidaysQueryMock(year, month),
}))

vi.mock('@entities/account', () => ({
  useAccountsQuery: (options?: { enabled?: boolean }) => useAccountsQueryMock(options),
}))

const { useDailyTradesRangeQueryMock } = vi.hoisted(() => ({ useDailyTradesRangeQueryMock: vi.fn() }))

vi.mock('@entities/trade', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@entities/trade')>()),
  useDailyTradesRangeQuery: (...args: unknown[]) => useDailyTradesRangeQueryMock(...args),
}))

describe('WeeklyMarketCalendar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-02T12:00:00+09:00'))
    useMonthlyHolidaysQueryMock.mockImplementation((year: number, month: number) => ({
      holidays: year === 2026 && month === 7 ? ['2026-07-01'] : [],
      isError: false,
    }))
    // 계좌 ID는 이제 WeeklyMarketCalendar가 useAccountsQuery() 캐시에서 직접 파생한다 (prop 아님)
    useAccountsQueryMock.mockReturnValue({ data: [] })
    useDailyTradesRangeQueryMock.mockReturnValue({ data: new Map(), isFetching: false, isError: false })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps only the holiday badge under the date without highlighting the whole cell', () => {
    render(<WeeklyMarketCalendar initialWeekStartDate="2026-06-28" isAuthenticated />)

    const holidayText = screen.getAllByText('휴장').find((node) => node.className.includes('text-xs'))
    const holidayCell = holidayText?.parentElement

    expect(holidayText).toHaveClass('text-[var(--gold)]')
    expect(holidayText).toHaveClass('bg-[var(--gold)]/15')
    expect(holidayText).toHaveClass('rounded')
    expect(holidayCell).not.toHaveClass('bg-[var(--gold)]/15')
  })

  it('uses a more visible today container style for dark theme contrast', () => {
    render(<WeeklyMarketCalendar initialWeekStartDate="2026-06-28" isAuthenticated />)

    const todayNumber = screen.getAllByText('2').find((node) => node.className.includes('bg-rose-500'))
    const todayContainer = todayNumber?.parentElement

    expect(todayContainer).toHaveClass('bg-rose-50')
    expect(todayContainer).toHaveClass('dark:bg-rose-500/15')
    expect(todayContainer).toHaveClass('border-rose-200/70')
    expect(todayContainer).toHaveClass('dark:border-rose-400/35')
  })

  it('shows a holiday-data error instead of treating every weekday as open', () => {
    useMonthlyHolidaysQueryMock.mockReturnValue({ holidays: [], isError: true })

    render(<WeeklyMarketCalendar initialWeekStartDate="2026-06-28" isAuthenticated />)

    expect(screen.getByText('휴장일 정보를 불러오지 못했습니다.')).toBeInTheDocument()
    expect(screen.queryByText('다음 휴장일')).not.toBeInTheDocument()
  })

  it('derives account ids from the accounts query cache instead of a prop', () => {
    useAccountsQueryMock.mockReturnValue({ data: [{ id: 'account-1' }] })

    render(<WeeklyMarketCalendar initialWeekStartDate="2026-06-28" isAuthenticated />)

    // accountIds.length > 0일 때만 매도/매수/대기 범례가 표시된다
    // (오늘 셀도 대기 배지를 표시할 수 있어 '대기'는 getAllByText로 확인)
    expect(screen.getByText('매도')).toBeInTheDocument()
    expect(screen.getByText('매수')).toBeInTheDocument()
    expect(screen.getAllByText('대기').length).toBeGreaterThan(0)
  })

  it('disables the accounts query when unauthenticated (게스트 401 루프 방지)', () => {
    render(<WeeklyMarketCalendar initialWeekStartDate="2026-06-28" isAuthenticated={false} />)

    expect(useAccountsQueryMock).toHaveBeenCalledWith({ enabled: false })
  })

  it('shows a trade-data error instead of rendering failed days as no trades', () => {
    useDailyTradesRangeQueryMock.mockReturnValue({ data: undefined, isFetching: false, isError: true })
    render(<WeeklyMarketCalendar initialWeekStartDate="2026-06-28" isAuthenticated />)

    expect(screen.getByText('거래 내역을 불러오지 못했습니다.')).toBeInTheDocument()
  })

  it('stacks label and compact amount so the badge fits a narrow day cell', () => {
    useAccountsQueryMock.mockReturnValue({ data: [{ id: 'a1' }] })
    useDailyTradesRangeQueryMock.mockReturnValue({
      data: new Map([['2026-06-30', { tradeCount: 1, byCurrency: [{ currency: 'USD', buyAmount: 12345, sellAmount: 0, buyCount: 1, sellCount: 0 }] }]]),
      isFetching: false,
      isError: false,
    })
    render(<WeeklyMarketCalendar initialWeekStartDate="2026-06-28" isAuthenticated />)

    const badge = screen.getByTitle('매수 $12,345.00')
    expect(badge).toHaveTextContent('매수$12K')
  })

  it('앞뒤 주 칸도 라벨·금액을 2줄 배지로 쌓는다', () => {
    useAccountsQueryMock.mockReturnValue({ data: [{ id: 'a1' }] })
    useDailyTradesRangeQueryMock.mockReturnValue({
      data: new Map([['2026-06-23', { tradeCount: 1, byCurrency: [{ currency: 'USD', buyAmount: 0, sellAmount: 2700, buyCount: 0, sellCount: 1 }] }]]),
      isFetching: false,
      isError: false,
    })
    render(<WeeklyMarketCalendar initialWeekStartDate="2026-06-28" isAuthenticated />)

    const badge = screen.getByTitle('매도 $2,700.00')
    expect(badge).toHaveTextContent('매도$2.7K')
    expect(badge.querySelector('br')).not.toBeNull()
  })

  it('크립토 계좌도 일별 체결 조회에 포함하고 "대기"는 주식 계좌가 있을 때만 보인다', () => {
    useAccountsQueryMock.mockReturnValue({
      data: [{ id: 'a2', nickname: '크립토', accountNoMasked: null, broker: 'UPBIT' }],
    })

    render(<WeeklyMarketCalendar initialWeekStartDate="2026-06-28" isAuthenticated />)

    expect(useDailyTradesRangeQueryMock.mock.lastCall?.[0]).toEqual(['a2'])
    expect(screen.queryByText('대기')).not.toBeInTheDocument()
  })

  it('주말·휴장일 칸에도 크립토 체결 배지를 통화별로 따로 그린다', () => {
    useAccountsQueryMock.mockReturnValue({ data: [{ id: 'a2', broker: 'UPBIT' }] })
    useDailyTradesRangeQueryMock.mockReturnValue({
      data: new Map([
        // 2026-07-04(토), 2026-07-01(휴장일), 2026-06-27(앞 주 토)
        ['2026-07-04', { tradeCount: 1, byCurrency: [{ currency: 'KRW', buyAmount: 123456, sellAmount: 0, buyCount: 1, sellCount: 0 }] }],
        ['2026-07-01', {
          tradeCount: 2,
          byCurrency: [
            { currency: 'KRW', buyAmount: 50000, sellAmount: 0, buyCount: 1, sellCount: 0 },
            { currency: 'USDT', buyAmount: 1234, sellAmount: 0, buyCount: 1, sellCount: 0 },
          ],
        }],
        ['2026-06-27', { tradeCount: 1, byCurrency: [{ currency: 'KRW', buyAmount: 0, sellAmount: 5000, buyCount: 0, sellCount: 1 }] }],
      ]),
      isFetching: false,
      isError: false,
    })
    render(<WeeklyMarketCalendar initialWeekStartDate="2026-06-28" isAuthenticated />)

    expect(screen.getByTitle('매수 123,456원')).toHaveTextContent('매수12만원')
    expect(screen.getByTitle('매수 50,000원')).toHaveTextContent('매수5만원')
    expect(screen.getByTitle('매수 1,234.00 USDT')).toHaveTextContent('매수1.2K USDT')
    expect(screen.getByTitle('매도 5,000원')).toHaveTextContent('매도5천원')
  })
})
