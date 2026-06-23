'use client'

import { useState, useSyncExternalStore } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { useMonthlyHolidaysQuery } from '@entities/market'

interface Props {
  holidays: string[]
  year: number
  month: number
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function MarketHolidayCalendar({ holidays, year, month }: Props) {
  const [displayYear, setDisplayYear] = useState(year)
  const [displayMonth, setDisplayMonth] = useState(month)

  const isInitialMonth = displayYear === year && displayMonth === month
  const { holidays: localHolidays, loading } = useMonthlyHolidaysQuery(
    displayYear,
    displayMonth,
    isInitialMonth ? holidays : undefined,
  )

  const todayStr = useSyncExternalStore(
    () => () => {},
    () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}` },
    () => null,
  )

  function prevMonth() {
    if (displayMonth === 1) { setDisplayYear(y => y - 1); setDisplayMonth(12) }
    else setDisplayMonth(m => m - 1)
  }
  function nextMonth() {
    if (displayMonth === 12) { setDisplayYear(y => y + 1); setDisplayMonth(1) }
    else setDisplayMonth(m => m + 1)
  }

  const holidaySet = new Set(localHolidays)
  const firstDay = new Date(displayYear, displayMonth - 1, 1)
  const daysInMonth = new Date(displayYear, displayMonth, 0).getDate()
  const startOffset = firstDay.getDay()

  const blanks = Array.from({ length: startOffset })
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const isHoliday = (day: number) => holidaySet.has(`${displayYear}-${pad(displayMonth)}-${pad(day)}`)
  const isToday = (day: number) =>
    todayStr === `${displayYear}-${displayMonth}-${day}`

  return (
    <div className="rounded-[var(--r-lg)] p-5 flex flex-col gap-1 bg-card border border-border shadow-[var(--sh-card)]">
      <span className="text-xs font-semibold tracking-widest uppercase text-[var(--brand-fg-soft)]">
        미국 휴장일
      </span>
      <div className="flex items-center justify-between mb-1">
        <button
          type="button"
          onClick={prevMonth}
          className="p-0.5 rounded hover:bg-muted transition-colors"
          aria-label="이전 달"
        >
          <ChevronLeft className="size-3.5 text-muted-foreground" />
        </button>
        <span className="text-xs text-muted-foreground">
          {displayYear}년 {displayMonth}월
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-0.5 rounded hover:bg-muted transition-colors"
          aria-label="다음 달"
        >
          <ChevronRight className="size-3.5 text-muted-foreground" />
        </button>
      </div>
      <div className={cn('grid grid-cols-7 gap-0.5 text-center', loading && 'opacity-50')}>
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={cn(
              'text-[10px] font-medium py-0.5',
              i === 0 ? 'text-pos' : i === 6 ? 'text-neg' : 'text-muted-foreground',
            )}
          >
            {d}
          </div>
        ))}
        {blanks.map((_, i) => (
          <div key={`b${i}`} />
        ))}
        {days.map(day => {
          const holiday = isHoliday(day)
          const todayCell = isToday(day)
          const dow = (startOffset + day - 1) % 7
          const isSun = dow === 0
          const isSat = dow === 6
          return (
            <div
              key={day}
              title={holiday ? '미국 휴장일' : undefined}
              className={cn(
                'w-7 h-7 flex items-center justify-center text-xs rounded-full mx-auto',
                holiday
                  ? 'bg-neg-bg text-neg'
                  : todayCell
                    ? 'bg-rose-50 text-rose-600'
                    : isSun
                      ? 'text-pos'
                      : isSat
                        ? 'text-neg'
                        : 'text-foreground',
              )}
            >
              {day}
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="size-[7px] rounded-full bg-neg shrink-0" />
        미국 증시 휴장
      </div>
    </div>
  )
}
