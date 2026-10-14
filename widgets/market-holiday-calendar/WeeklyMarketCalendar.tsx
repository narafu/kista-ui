'use client'

import { useState, useSyncExternalStore } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { fmtUsd } from '@shared/lib/format'
import { Surface } from '@shared/ui/Surface'
import { IconButton } from '@shared/ui/IconButton'
import { Spinner } from '@shared/ui/Spinner'
import { useAccountsQuery } from '@entities/account'
import { useMonthlyHolidaysQuery } from '@entities/market'
import { useDailyTradesRangeQuery, directionBadgeClass, directionTextClass, type DayTradeSummary } from '@entities/trade'

interface Props {
  initialWeekStartDate: string // 'YYYY-MM-DD', 이번 주 일요일
  isAuthenticated: boolean
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// 7열 칸(모바일 약 33px)에 들어가도록 2자리 유효숫자 축약 — 정확한 금액은 title로 노출
const compactUsd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumSignificantDigits: 2 })

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
        {/* 일=빨강·토=파랑은 한국 달력 관례라 의도적으로 유지 — 매수/매도와 같은 토큰이지만 요일 숫자에만 쓰여 혼동 여지가 작다 */}
        <span className={cn(
          'text-xs',
          isSun ? 'text-pos' : isSat ? 'text-neg' : 'text-muted-foreground',
        )}>
          {day.getDate()}
        </span>
        {isHoliday && !isWeekend && (
          <span className="text-[10px] leading-none text-[var(--gold)]">휴장</span>
        )}
        {!isWeekend && !isHoliday && daySummary && (
          <span className="flex flex-col items-center gap-px">
            {daySummary.buyCount > 0 && (
              <span className={cn('text-[10px] leading-none', directionTextClass('BUY'))} title={`매수 $${fmtUsd(daySummary.buyAmountUsd, 0)}`}>
                {`매수 ${compactUsd.format(daySummary.buyAmountUsd)}`}
              </span>
            )}
            {daySummary.sellCount > 0 && (
              <span className={cn('text-[10px] leading-none', directionTextClass('SELL'))} title={`매도 $${fmtUsd(daySummary.sellAmountUsd, 0)}`}>
                {`매도 ${compactUsd.format(daySummary.sellAmountUsd)}`}
              </span>
            )}
          </span>
        )}
      </div>
    )
  })
}

// 라벨·금액 2줄로 쌓아 칸 너비를 넘지 않게 한다(좌우 패딩 없음)
const DAY_BADGE_CLASS = 'block rounded py-px text-[11px] font-semibold leading-tight'

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
      badge = <span className="text-xs px-1.5 py-[1px] rounded bg-muted text-muted-foreground">휴</span>
    } else if (isHoliday) {
      badge = <span className="text-xs font-semibold px-1.5 py-[1px] rounded bg-[var(--gold)]/15 text-[var(--gold)]">휴장</span>
    } else if (isToday && !summary && accountIds.length > 0) {
      badge = <span className="text-xs font-semibold px-1.5 py-[1px] rounded bg-info-bg text-info">대기</span>
      sub = <span className="text-xs text-muted-foreground">오늘</span>
    } else if (summary) {
      badge = (
        <span className="flex w-full flex-col items-stretch gap-0.5">
          {summary.buyCount > 0 && (
            <span className={cn(DAY_BADGE_CLASS, directionBadgeClass('BUY'))} title={`매수 $${fmtUsd(summary.buyAmountUsd, 0)}`}>
              매수<br />{compactUsd.format(summary.buyAmountUsd)}
            </span>
          )}
          {summary.sellCount > 0 && (
            <span className={cn(DAY_BADGE_CLASS, directionBadgeClass('SELL'))} title={`매도 $${fmtUsd(summary.sellAmountUsd, 0)}`}>
              매도<br />{compactUsd.format(summary.sellAmountUsd)}
            </span>
          )}
        </span>
      )
      sub = <span className="text-xs text-muted-foreground">{summary.tradeCount}체결</span>
    } else {
      badge = <span className="text-xs text-muted-foreground">—</span>
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
          // 다크 --rose-500(#C77F63)은 흰 글자 대비 3.16이라 어두운 배경색 글자로 바꾼다
          isToday ? 'bg-rose-500 text-white dark:text-background font-bold' :
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

export function WeeklyMarketCalendar({ initialWeekStartDate, isAuthenticated }: Props) {
  const { data: accounts } = useAccountsQuery({ enabled: isAuthenticated })
  const accountIds = accounts?.map((account) => account.id) ?? []

  const [displayWeekStart, setDisplayWeekStart] = useState(
    () => new Date(initialWeekStartDate + 'T00:00:00'),
  )
  const weekEnd = addDays(displayWeekStart, 6)
  const prevWeekStart = addDays(displayWeekStart, -7)
  const nextWeekStart = addDays(displayWeekStart, 7)

  const todayStr = useSyncExternalStore(
    () => () => {},
    () => toDateStr(new Date()),
    () => null,
  )

  // 달 경계 주: 시작 달·끝 달 각각 조회 (queryKey 동일하면 캐시 재사용)
  const h1Query = useMonthlyHolidaysQuery(
    displayWeekStart.getFullYear(),
    displayWeekStart.getMonth() + 1,
  )
  const h2Query = useMonthlyHolidaysQuery(
    weekEnd.getFullYear(),
    weekEnd.getMonth() + 1,
  )
  // 전주 시작 달 / 다음주 끝 달 (달 경계 커버, 동일 month는 캐시 재사용)
  const hPrevQuery = useMonthlyHolidaysQuery(
    prevWeekStart.getFullYear(),
    prevWeekStart.getMonth() + 1,
  )
  const hNextQuery = useMonthlyHolidaysQuery(
    addDays(nextWeekStart, 6).getFullYear(),
    addDays(nextWeekStart, 6).getMonth() + 1,
  )
  const holidayQueries = [h1Query, h2Query, hPrevQuery, hNextQuery]
  const holidayFetchFailed = holidayQueries.some((query) => query.isError)
  const holidaySet = new Set(holidayQueries.flatMap((query) => query.holidays))

  // 전주 시작~다음주 끝(3주)을 1회 요청으로 조회 — 계좌별/주별 개별 요청 대신 배치 API 사용
  const { data: tradeSummary = new Map(), isFetching: anyFetching, isError: tradesFetchFailed } = useDailyTradesRangeQuery(
    accountIds,
    prevWeekStart,
    addDays(nextWeekStart, 6),
  )

  // 다음 휴장일 D-day — 조회된 휴일(표시 범위 달 범위) 중 오늘 이후 첫 날짜 (감사 A-05)
  const nextHoliday = todayStr
    ? ([...holidaySet].filter((d) => d >= todayStr).sort()[0] ?? null)
    : null
  const ddayCount = nextHoliday && todayStr
    ? Math.round((new Date(nextHoliday + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) / 86400000)
    : null

  return (
    <Surface className="p-5 flex flex-col gap-1">
      <span className="text-sm font-semibold tracking-widest uppercase text-[var(--brand-fg-soft)]">
        미국 휴장일 · 주간 거래
      </span>
      <div className="flex items-center justify-between mb-1">
        <IconButton onClick={() => setDisplayWeekStart(d => addDays(d, -7))} aria-label="이전 주" className="-my-2.5">
          <ChevronLeft className="size-4" />
        </IconButton>
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          {weekLabel(displayWeekStart)}
          {anyFetching && <Spinner size={12} />}
        </span>
        <IconButton onClick={() => setDisplayWeekStart(d => addDays(d, 7))} aria-label="다음 주" className="-my-2.5">
          <ChevronRight className="size-4" />
        </IconButton>
      </div>

      <div className="grid grid-cols-7 text-center gap-0.5" aria-busy={anyFetching}>
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
        <CompactRow rowStart={prevWeekStart} summary={tradeSummary} holidaySet={holidaySet} />
        <CurrentRow weekStart={displayWeekStart} tradeSummary={tradeSummary} holidaySet={holidaySet} todayStr={todayStr} accountIds={accountIds} />
        <CompactRow rowStart={nextWeekStart} summary={tradeSummary} holidaySet={holidaySet} />
      </div>

      <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="size-[7px] rounded-full bg-[var(--gold)] shrink-0" />
          미국 휴장
        </span>
        {accountIds.length > 0 && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="size-[7px] rounded bg-pos shrink-0" />
              매수
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-[7px] rounded bg-neg shrink-0" />
              매도
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-[7px] rounded bg-info shrink-0" />
              대기
            </span>
          </>
        )}
      </div>

      {tradesFetchFailed && (
        <p className="pt-2 text-sm text-warn">거래 내역을 불러오지 못했습니다</p>
      )}
      {holidayFetchFailed ? (
        <p className="mt-auto pt-2 text-sm text-warn">휴장일 정보를 불러오지 못했습니다</p>
      ) : nextHoliday && ddayCount !== null && (
        <p className="mt-auto pt-2 text-sm text-muted-foreground">
          다음 휴장일{' '}
          <span className="font-medium text-[var(--gold)]">{monthDayLabel(nextHoliday)}</span>
          <span className="num">{ddayCount === 0 ? ' · 오늘' : ` · D-${ddayCount}`}</span>
        </p>
      )}
    </Surface>
  )
}
