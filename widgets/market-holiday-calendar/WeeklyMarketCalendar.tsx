'use client'

import { useState, useSyncExternalStore } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { useMonthlyHolidaysQuery } from '@entities/market'
import { useWeeklyTradeSummaryQuery } from '@entities/trade'

interface Props {
  holidays: string[]
  initialWeekStartDate: string // 'YYYY-MM-DD', 이번 주 일요일
  accountIds: string[]
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function pad(n: number) { return String(n).padStart(2, '0') }

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function weekLabel(weekStart: Date): string {
  const y = weekStart.getFullYear()
  const m = weekStart.getMonth() + 1
  const firstDow = new Date(y, weekStart.getMonth(), 1).getDay()
  const wn = Math.ceil((weekStart.getDate() + firstDow) / 7)
  return `${y}년 ${m}월 ${wn}주`
}

export function WeeklyMarketCalendar({ holidays, initialWeekStartDate, accountIds }: Props) {
  const [displayWeekStart, setDisplayWeekStart] = useState(
    () => new Date(initialWeekStartDate + 'T00:00:00'),
  )
  const weekEnd = addDays(displayWeekStart, 6)

  const todayStr = useSyncExternalStore(
    () => () => {},
    () => toDateStr(new Date()),
    () => null,
  )

  // 달 경계 주: 시작 달·끝 달 각각 조회 (queryKey 동일하면 캐시 재사용)
  const initialDate = new Date(initialWeekStartDate + 'T00:00:00')
  const { holidays: h1 } = useMonthlyHolidaysQuery(
    displayWeekStart.getFullYear(),
    displayWeekStart.getMonth() + 1,
    displayWeekStart.getFullYear() === initialDate.getFullYear() &&
    displayWeekStart.getMonth() === initialDate.getMonth()
      ? holidays
      : undefined,
  )
  const { holidays: h2 } = useMonthlyHolidaysQuery(
    weekEnd.getFullYear(),
    weekEnd.getMonth() + 1,
  )
  const holidaySet = new Set([...h1, ...h2])

  const { data: tradeSummary = new Map(), isFetching } = useWeeklyTradeSummaryQuery(
    accountIds,
    displayWeekStart,
  )

  function renderRow(rowStart: Date, isCurrent: boolean) {
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(rowStart, i)
      const ds = toDateStr(day)
      const isSun = i === 0
      const isSat = i === 6

      if (!isCurrent) {
        return (
          <div key={ds} className="flex justify-center py-1">
            <span className={cn(
              'text-xs',
              isSun ? 'text-pos/40' : isSat ? 'text-neg/40' : 'text-muted-foreground/30',
            )}>
              {day.getDate()}
            </span>
          </div>
        )
      }

      const isToday = ds === todayStr
      const isHoliday = holidaySet.has(ds)
      const isWeekend = isSun || isSat
      const summary = !isWeekend ? tradeSummary.get(ds) : undefined

      let badge: React.ReactNode
      let sub: React.ReactNode = null

      if (isWeekend) {
        badge = <span className="text-xs px-1.5 py-[1px] rounded bg-muted text-muted-foreground/50">휴</span>
      } else if (isHoliday) {
        badge = <span className="text-xs font-semibold px-1.5 py-[1px] rounded bg-neg-bg text-neg">휴장</span>
      } else if (isToday && !summary) {
        badge = <span className="text-xs font-semibold px-1.5 py-[1px] rounded bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400">대기중</span>
        sub = <span className="text-xs text-muted-foreground">오늘</span>
      } else if (summary) {
        const pos = summary.netAmountUsd >= 0
        badge = (
          <span className={cn(
            'text-xs font-semibold px-1.5 py-[1px] rounded',
            pos ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-neg-bg text-neg',
          )}>
            {pos ? '매도 +' : '매수 '}${Math.abs(summary.netAmountUsd).toFixed(0)}
          </span>
        )
        sub = <span className="text-xs text-muted-foreground">{summary.tradeCount}체결</span>
      } else {
        badge = <span className="text-xs text-muted-foreground/30">—</span>
      }

      return (
        <div
          key={ds}
          className={cn(
            'flex flex-col items-center gap-[3px] py-1.5 rounded-[10px]',
            isToday && 'bg-rose-50 dark:bg-rose-500/10',
            isHoliday && !isToday && 'bg-neg-bg',
          )}
        >
          <div className={cn(
            'w-[26px] h-[26px] flex items-center justify-center text-xs font-medium rounded-full',
            isToday ? 'bg-rose-500 text-white font-bold' :
            isHoliday ? 'text-neg' :
            isSun ? 'text-pos' :
            isSat ? 'text-neg' :
            'text-foreground',
          )}>
            {day.getDate()}
          </div>
          {badge}
          {sub}
        </div>
      )
    })
  }

  return (
    <div className="rounded-[var(--r-lg)] p-5 flex flex-col gap-1 bg-card border border-border shadow-[var(--sh-card)]">
      <span className="text-sm font-semibold tracking-widest uppercase text-rose-500">
        미국 휴장일 · 주간 거래
      </span>
      <div className="flex items-center justify-between mb-1">
        <button
          type="button"
          onClick={() => setDisplayWeekStart(d => addDays(d, -7))}
          className="p-0.5 rounded hover:bg-muted transition-colors"
          aria-label="이전 주"
        >
          <ChevronLeft className="size-3.5 text-muted-foreground" />
        </button>
        <span className="text-sm text-muted-foreground">
          {weekLabel(displayWeekStart)}
        </span>
        <button
          type="button"
          onClick={() => setDisplayWeekStart(d => addDays(d, 7))}
          className="p-0.5 rounded hover:bg-muted transition-colors"
          aria-label="다음 주"
        >
          <ChevronRight className="size-3.5 text-muted-foreground" />
        </button>
      </div>

      <div className={cn('grid grid-cols-7 text-center gap-0.5', isFetching && 'opacity-50')}>
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={cn(
              'text-xs font-medium py-0.5',
              i === 0 ? 'text-pos' : i === 6 ? 'text-neg' : 'text-muted-foreground',
            )}
          >
            {d}
          </div>
        ))}
        {renderRow(addDays(displayWeekStart, -7), false)}
        {renderRow(displayWeekStart, true)}
        {renderRow(addDays(displayWeekStart, 7), false)}
      </div>

      <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="size-[7px] rounded-full bg-neg shrink-0" />
          미국 휴장
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-[7px] rounded bg-green-500 dark:bg-green-400 shrink-0" />
          매도
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-[7px] rounded bg-neg shrink-0" />
          매수
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-[7px] rounded bg-orange-400 dark:bg-orange-400 shrink-0" />
          대기중
        </span>
      </div>
    </div>
  )
}
