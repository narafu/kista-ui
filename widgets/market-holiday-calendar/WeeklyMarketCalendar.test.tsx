import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { WeeklyMarketCalendar } from './WeeklyMarketCalendar'

const { useMonthlyHolidaysQueryMock } = vi.hoisted(() => ({
  useMonthlyHolidaysQueryMock: vi.fn(),
}))

vi.mock('@entities/market', () => ({
  useMonthlyHolidaysQuery: (year: number, month: number) => useMonthlyHolidaysQueryMock(year, month),
}))

vi.mock('@entities/trade', () => ({
  useDailyTradesRangeQuery: () => ({
    data: new Map(),
    isFetching: false,
  }),
}))

describe('WeeklyMarketCalendar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-02T12:00:00+09:00'))
    useMonthlyHolidaysQueryMock.mockImplementation((year: number, month: number) => ({
      holidays: year === 2026 && month === 7 ? ['2026-07-01'] : [],
      isError: false,
    }))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps only the holiday badge under the date without highlighting the whole cell', () => {
    render(
      <WeeklyMarketCalendar
        holidays={[]}
        initialWeekStartDate="2026-06-28"
        accountIds={[]}
      />,
    )

    const holidayText = screen.getAllByText('휴장').find((node) => node.className.includes('text-xs'))
    const holidayCell = holidayText?.parentElement

    expect(holidayText).toHaveClass('text-[var(--gold)]')
    expect(holidayText).toHaveClass('bg-[var(--gold)]/15')
    expect(holidayText).toHaveClass('rounded')
    expect(holidayCell).not.toHaveClass('bg-[var(--gold)]/15')
  })

  it('uses a more visible today container style for dark theme contrast', () => {
    render(
      <WeeklyMarketCalendar
        holidays={[]}
        initialWeekStartDate="2026-06-28"
        accountIds={[]}
      />,
    )

    const todayNumber = screen.getAllByText('2').find((node) => node.className.includes('bg-rose-500'))
    const todayContainer = todayNumber?.parentElement

    expect(todayContainer).toHaveClass('bg-rose-50')
    expect(todayContainer).toHaveClass('dark:bg-rose-500/15')
    expect(todayContainer).toHaveClass('border-rose-200/70')
    expect(todayContainer).toHaveClass('dark:border-rose-400/35')
  })

  it('shows a holiday-data error instead of treating every weekday as open', () => {
    useMonthlyHolidaysQueryMock.mockReturnValue({ holidays: [], isError: true })

    render(
      <WeeklyMarketCalendar
        holidays={[]}
        initialWeekStartDate="2026-06-28"
        accountIds={[]}
      />,
    )

    expect(screen.getByText('휴장일 정보를 불러오지 못했습니다')).toBeInTheDocument()
    expect(screen.queryByText('다음 휴장일')).not.toBeInTheDocument()
  })
})
