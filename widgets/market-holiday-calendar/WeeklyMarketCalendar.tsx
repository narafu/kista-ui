'use client'

import { useState, useSyncExternalStore } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { fmtUsd } from '@shared/lib/format'
import { Surface } from '@shared/ui/Surface'
import { useMonthlyHolidaysQuery } from '@entities/market'
import { useWeeklyTradeSummaryQuery, directionTextClass, type DayTradeSummary } from '@entities/trade'

interface Props {
  holidays: string[]
  initialWeekStartDate: string // 'YYYY-MM-DD', 이번 주 일요일
  accountIds: string[]
  extended?: boolean // PC 전용: 전전 주 · 다음-다음 주 추가 표시 (총 5주)
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

/** 'YYYY-MM-DD' → 'M월 D일' */
function monthDayLabel(ds: string): string {
  const [, m, d] = ds.split('-').map(Number)
  return `${m}월 ${d}일`
}

function weekLabel(weekStart: Date): string {
  const y = weekStart.getFullYear()
  const m = weekStart.getMonth() + 1
  const firstDow = new Date(y, weekStart.getMonth(), 1).getDay()
  const wn = Math.ceil((weekStart.getDate() + firstDow) / 7)
  return `${y}년 ${m}월 ${wn}주`
}

interface CompactRowProps {
  rowStart: Date
  summary: Map<string, DayTradeSummary>
  holidaySet: Set<string>
}

function CompactRow({ rowStart, summary, holidaySet }: CompactRowProps) {
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(rowStart, i)
    const ds = toDateStr(day)
    const isSun = i === 0
    const isSat = i === 6
    const isWeekend = isSun || isSat
    const isHoliday = holidaySet.has(ds)
    const daySummary = !isWeekend ? summary.get(ds) : undefined

    return (
      <div key={ds} className="flex flex-col items-center gap-0.5 py-1">
        <span className={cn(
          'text-xs',
          isSun ? 'text-pos/40' : isSat ? 'text-neg/40' : 'text-muted-foreground/30',
        )}>
          {day.getDate()}
        </span>
        {isHoliday && !isWeekend && (
          <span className="text-[10px] leading-none text-[var(--gold)]/60">휴장</span>
        )}
        {!isWeekend && !isHoliday && daySummary && (
          <span className={cn(
            'text-[10px] leading-none opacity-60',
            directionTextClass(daySummary.netAmountUsd >= 0 ? 'SELL' : 'BUY'),
          )}>
            {`${daySummary.netAmountUsd >= 0 ? '+' : '-'}$${fmtUsd(Math.abs(daySummary.netAmountUsd), 0)}`}
          </span>
        )}
      </div>
    )
  })
}

interface CurrentRowProps {
  weekStart: Date
  tradeSummary: Map<string, DayTradeSummary>
  holidaySet: Set<string>
  todayStr: string | null
  accountIds: string[]
}

function CurrentRow({ weekStart, tradeSummary, holidaySet, todayStr, accountIds }: CurrentRowProps) {
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i)
    const ds = toDateStr(day)
    const isSun = i === 0
    const isSat = i === 6

    const isToday = ds === todayStr
    const isHoliday = holidaySet.has(ds)
    const isWeekend = isSun || isSat
    const summary = !isWeekend ? tradeSummary.get(ds) : undefined

    let badge: React.ReactNode
    let sub: React.ReactNode = null

    if (isWeekend) {
      badge = <span className="text-xs px-1.5 py-[1px] rounded bg-muted text-muted-foreground/50">휴</span>
    } else if (isHoliday) {
      badge = <span className="text-xs font-semibold px-1.5 py-[1px] rounded bg-[var(--gold)]/15 text-[var(--gold)]">휴장</span>
    } else if (isToday && !summary && accountIds.length > 0) {
      badge = <span className="text-xs font-semibold px-1.5 py-[1px] rounded bg-warn-bg text-warn">대기중</span>
      sub = <span className="text-xs text-muted-foreground">오늘</span>
    } else if (summary) {
      const isSell = summary.netAmountUsd >= 0
      badge = (
        <span className={cn(
          'text-xs font-semibold px-1.5 py-[1px] rounded',
          isSell ? 'bg-neg-bg text-neg' : 'bg-pos-bg text-pos',
        )}>
          {`${isSell ? '매도 +' : '매수 '}$${fmtUsd(Math.abs(summary.netAmountUsd), 0)}`}
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
          isToday && 'border border-rose-200/70 bg-rose-50 dark:border-rose-400/35 dark:bg-rose-500/15',
        )}
      >
        <div className={cn(
          'w-[26px] h-[26px] flex items-center justify-center text-xs font-medium rounded-full',
          isToday ? 'bg-rose-500 text-white font-bold' :
          isHoliday ? 'text-[var(--gold)]' :
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

export function WeeklyMarketCalendar({ holidays, initialWeekStartDate, accountIds, extended = false }: Props) {
  const [displayWeekStart, setDisplayWeekStart] = useState(
    () => new Date(initialWeekStartDate + 'T00:00:00'),
  )
  const weekEnd = addDays(displayWeekStart, 6)
  const prevWeekStart = addDays(displayWeekStart, -7)
  const prevPrevWeekStart = addDays(displayWeekStart, -14)
  const nextWeekStart = addDays(displayWeekStart, 7)
  const nextNextWeekStart = addDays(displayWeekStart, 14)
  const earliestWeekStart = extended ? prevPrevWeekStart : prevWeekStart
  const farthestWeekEnd = addDays(extended ? nextNextWeekStart : nextWeekStart, 6)

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
  // 전주 시작 달 / 다음주 끝 달 (달 경계 커버, 동일 month는 캐시 재사용)
  const { holidays: hPrev } = useMonthlyHolidaysQuery(
    earliestWeekStart.getFullYear(),
    earliestWeekStart.getMonth() + 1,
  )
  const { holidays: hNext } = useMonthlyHolidaysQuery(
    farthestWeekEnd.getFullYear(),
    farthestWeekEnd.getMonth() + 1,
  )
  const holidaySet = new Set([...h1, ...h2, ...hPrev, ...hNext])

  const { data: tradeSummary = new Map(), isFetching } = useWeeklyTradeSummaryQuery(
    accountIds,
    displayWeekStart,
  )
  const { data: prevTradeSummary = new Map(), isFetching: isPrevFetching } = useWeeklyTradeSummaryQuery(
    accountIds,
    prevWeekStart,
  )
  const { data: prevPrevTradeSummary = new Map(), isFetching: isPrevPrevFetching } = useWeeklyTradeSummaryQuery(
    accountIds,
    prevPrevWeekStart,
    extended,
  )
  const { data: nextTradeSummary = new Map(), isFetching: isNextFetching } = useWeeklyTradeSummaryQuery(
    accountIds,
    nextWeekStart,
  )
  const { data: nextNextTradeSummary = new Map(), isFetching: isNextNextFetching } = useWeeklyTradeSummaryQuery(
    accountIds,
    nextNextWeekStart,
    extended,
  )
  const anyFetching = isFetching || isPrevFetching || isNextFetching ||
    (extended && (isPrevPrevFetching || isNextNextFetching))

  // 다음 휴장일 D-day — 조회된 휴일(표시 범위 달 범위) 중 오늘 이후 첫 날짜 (감사 A-05)
  const nextHoliday = todayStr
    ? ([...holidaySet].filter((d) => d >= todayStr).sort()[0] ?? null)
    : null
  const ddayCount = nextHoliday && todayStr
    ? Math.round((new Date(nextHoliday + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) / 86400000)
    : null

  return (
    <Surface className="p-5 flex flex-col gap-1">
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

      <div className={cn('grid grid-cols-7 text-center gap-0.5', anyFetching && 'opacity-50')}>
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
        {extended && (
          <CompactRow rowStart={prevPrevWeekStart} summary={prevPrevTradeSummary} holidaySet={holidaySet} />
        )}
        <CompactRow rowStart={prevWeekStart} summary={prevTradeSummary} holidaySet={holidaySet} />
        <CurrentRow weekStart={displayWeekStart} tradeSummary={tradeSummary} holidaySet={holidaySet} todayStr={todayStr} accountIds={accountIds} />
        <CompactRow rowStart={nextWeekStart} summary={nextTradeSummary} holidaySet={holidaySet} />
        {extended && (
          <CompactRow rowStart={nextNextWeekStart} summary={nextNextTradeSummary} holidaySet={holidaySet} />
        )}
      </div>

      <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="size-[7px] rounded-full bg-[var(--gold)] shrink-0" />
          미국 휴장
        </span>
        {accountIds.length > 0 && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="size-[7px] rounded bg-neg shrink-0" />
              매도
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-[7px] rounded bg-pos shrink-0" />
              매수
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-[7px] rounded bg-warn shrink-0" />
              대기중
            </span>
          </>
        )}
      </div>

      {nextHoliday && ddayCount !== null && (
        <p className="mt-auto pt-2 text-sm text-muted-foreground">
          다음 휴장일{' '}
          <span className="font-medium" style={{ color: 'var(--gold)' }}>{monthDayLabel(nextHoliday)}</span>
          <span className="num">{ddayCount === 0 ? ' · 오늘' : ` · D-${ddayCount}`}</span>
        </p>
      )}
    </Surface>
  )
}
