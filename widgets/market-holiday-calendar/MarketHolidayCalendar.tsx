'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { useMonthlyHolidaysQuery } from '@entities/market'

interface Props {
  holidays: string[]
  year: number
  month: number
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const WEEKEND_IDX = new Set([0, 6])

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

  const [today, setToday] = useState<Date | null>(null)
  useEffect(() => { setToday(new Date()) }, [])

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
    today !== null &&
    today.getFullYear() === displayYear &&
    today.getMonth() + 1 === displayMonth &&
    today.getDate() === day

  return (
    <div className="rounded-[var(--r-lg)] p-5 flex flex-col gap-1 bg-card border border-border shadow-[var(--sh-card)]">
      <span className="text-[11px] font-semibold tracking-widest uppercase text-rose-500">
        미국 휴장일
      </span>
      <div className="flex items-center justify-between mb-1">
        <button
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
              WEEKEND_IDX.has(i)
                ? 'text-rose-400 dark:text-rose-500'
                : 'text-muted-foreground',
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
          const weekend = WEEKEND_IDX.has(dow)
          return (
            <div
              key={day}
              title={holiday ? '미국 휴장일' : undefined}
              className={cn(
                'w-7 h-7 flex items-center justify-center text-xs rounded-full mx-auto',
                holiday
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
                  : weekend
                    ? 'text-rose-400 dark:text-rose-500'
                    : 'text-foreground',
                todayCell && 'ring-2 ring-rose-400',
              )}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}
