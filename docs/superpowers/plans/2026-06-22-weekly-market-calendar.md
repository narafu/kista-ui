# Weekly Market Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대시보드의 월 기준 `MarketHolidayCalendar`를 주 기준 `WeeklyMarketCalendar`로 교체한다. 이번 주 날짜별로 전체 계좌 합산 체결 수·순거래 금액을 표시하고, 이전/다음 주는 날짜만 희미하게 표시한다.

**Architecture:** `useWeeklyTradeSummaryQuery` 훅이 모든 계좌에 대해 `getDailyTransactions`를 병렬 호출해 날짜별 집계 Map을 반환한다. `WeeklyMarketCalendar`는 이 데이터와 `useMonthlyHolidaysQuery`를 조합해 렌더링한다. 달 경계 주는 두 달 쿼리를 모두 호출하되 동일 queryKey면 React Query 캐시가 재사용된다.

**Tech Stack:** Next.js 16 App Router, React Query (`@tanstack/react-query`), TypeScript, Tailwind CSS, `cn()` (shadcn 유틸)

## Global Constraints

- 싱글 쿼트, 세미콜론 없음, import 중괄호 공백: `{ useState }`
- `style={{ ... }}` 인라인 금지 (CSS 토큰 제외)
- FSD alias 필수: `@entities/*`, `@shared/*`, `@widgets/*`
- Client Component에서 kista-api 직접 호출 금지 — `clientFetch`/Route Handler 경유
- `/api/accounts/[[...path]]` catch-all Route Handler가 `/daily-trades` 포함 처리 — 별도 Route Handler 추가 불필요
- `npm run typecheck` 검증 명령어

---

## File Map

| 파일 | 작업 |
|---|---|
| `entities/trade/hooks/useWeeklyTradeSummaryQuery.ts` | 신규 생성 |
| `entities/trade/index.ts` | 훅 re-export 추가 |
| `widgets/market-holiday-calendar/WeeklyMarketCalendar.tsx` | 신규 생성 |
| `widgets/market-holiday-calendar/index.ts` | WeeklyMarketCalendar re-export 추가 |
| `widgets/dashboard/DashboardOverview.tsx` | 달력 교체, props 변경 |
| `widgets/dashboard/DashboardEmpty.tsx` | 달력 교체, props 변경 |
| `app/(main)/dashboard/page.tsx` | weekStartDate 계산 및 전달 |

---

### Task 1: useWeeklyTradeSummaryQuery 훅

**Files:**
- Create: `entities/trade/hooks/useWeeklyTradeSummaryQuery.ts`
- Modify: `entities/trade/index.ts`

**Interfaces:**
- Consumes: `getDailyTransactions(accountId, { from, to })` from `../api`
- Produces: `useWeeklyTradeSummaryQuery(accountIds: string[], weekStart: Date): { data: Map<string, DayTradeSummary>; isFetching: boolean }`
- Produces type: `DayTradeSummary { tradeCount: number; netAmountUsd: number }`

- [ ] **Step 1: 훅 파일 생성**

`entities/trade/hooks/useWeeklyTradeSummaryQuery.ts` 전체 내용:

```ts
'use client'

import { useQuery } from '@tanstack/react-query'
import { getDailyTransactions } from '../api'

export interface DayTradeSummary {
  tradeCount: number
  netAmountUsd: number // SELL 합산 − BUY 합산 (실현 손익 아님, 순거래 금액)
}

function pad(n: number) { return String(n).padStart(2, '0') }

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function useWeeklyTradeSummaryQuery(accountIds: string[], weekStart: Date) {
  const from = toDateStr(weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const to = toDateStr(weekEnd)

  return useQuery<Map<string, DayTradeSummary>>({
    queryKey: ['weeklyTrades', accountIds.join(','), from],
    queryFn: async () => {
      const results = await Promise.allSettled(
        accountIds.map(id => getDailyTransactions(id, { from, to })),
      )
      const map = new Map<string, DayTradeSummary>()
      for (const r of results) {
        if (r.status !== 'fulfilled') continue
        for (const item of r.value.items) {
          const prev = map.get(item.tradeDate) ?? { tradeCount: 0, netAmountUsd: 0 }
          const sign = item.direction === 'SELL' ? 1 : -1
          map.set(item.tradeDate, {
            tradeCount: prev.tradeCount + 1,
            netAmountUsd: prev.netAmountUsd + sign * item.tradeAmountUsd,
          })
        }
      }
      return map
    },
    staleTime: 1000 * 60 * 5,
    enabled: accountIds.length > 0,
  })
}
```

- [ ] **Step 2: entities/trade/index.ts에 re-export 추가**

기존 마지막 줄 아래에 추가:

```ts
export { useWeeklyTradeSummaryQuery } from './hooks/useWeeklyTradeSummaryQuery'
export type { DayTradeSummary } from './hooks/useWeeklyTradeSummaryQuery'
```

- [ ] **Step 3: 타입 검사**

```bash
npm run typecheck
```

오류 없이 통과해야 함.

- [ ] **Step 4: 커밋**

```bash
git add entities/trade/hooks/useWeeklyTradeSummaryQuery.ts entities/trade/index.ts
git commit -m "feat(trade): 주간 거래 요약 쿼리 훅 추가"
```

---

### Task 2: WeeklyMarketCalendar 컴포넌트

**Files:**
- Create: `widgets/market-holiday-calendar/WeeklyMarketCalendar.tsx`
- Modify: `widgets/market-holiday-calendar/index.ts`

**Interfaces:**
- Consumes: `useMonthlyHolidaysQuery(year, month, initialData?)` from `@entities/market`
- Consumes: `useWeeklyTradeSummaryQuery(accountIds, weekStart)` + `DayTradeSummary` from `@entities/trade`
- Props: `{ holidays: string[]; initialWeekStartDate: string; accountIds: string[] }`

- [ ] **Step 1: WeeklyMarketCalendar 컴포넌트 생성**

`widgets/market-holiday-calendar/WeeklyMarketCalendar.tsx` 전체 내용:

```tsx
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
              'text-[11px]',
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
        badge = <span className="text-[9px] px-1.5 py-[1px] rounded bg-muted text-muted-foreground/50">휴</span>
      } else if (isHoliday) {
        badge = <span className="text-[9px] font-semibold px-1.5 py-[1px] rounded bg-neg-bg text-neg">휴장</span>
      } else if (isToday && !summary) {
        badge = <span className="text-[9px] font-semibold px-1.5 py-[1px] rounded bg-orange-50 text-orange-500">대기중</span>
        sub = <span className="text-[9px] text-muted-foreground">오늘</span>
      } else if (summary) {
        const pos = summary.netAmountUsd >= 0
        badge = (
          <span className={cn(
            'text-[9px] font-semibold px-1.5 py-[1px] rounded',
            pos ? 'bg-green-50 text-green-700' : 'bg-neg-bg text-neg',
          )}>
            {pos ? '+' : ''}${Math.abs(summary.netAmountUsd).toFixed(0)}
          </span>
        )
        sub = <span className="text-[9px] text-muted-foreground">{summary.tradeCount}체결</span>
      } else {
        badge = <span className="text-[9px] text-muted-foreground/30">—</span>
      }

      return (
        <div
          key={ds}
          className={cn(
            'flex flex-col items-center gap-[3px] py-1.5 rounded-[10px]',
            isToday && 'bg-rose-50',
            isHoliday && !isToday && 'bg-neg-bg',
          )}
        >
          <div className={cn(
            'w-[26px] h-[26px] flex items-center justify-center text-xs font-medium rounded-full',
            isToday ? 'text-neg font-bold' :
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
      <span className="text-[11px] font-semibold tracking-widest uppercase text-rose-500">
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
        <span className="text-xs text-muted-foreground">
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
              'text-[10px] font-medium py-0.5',
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

      <div className="mt-2 flex items-center gap-3 text-[10.5px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="size-[7px] rounded-full bg-neg shrink-0" />
          미국 휴장
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-[7px] rounded bg-green-200 shrink-0" />
          수익
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-[7px] rounded bg-neg-bg shrink-0" />
          손실
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: index.ts에 re-export 추가**

`widgets/market-holiday-calendar/index.ts` 전체를 다음으로 교체:

```ts
export { MarketHolidayCalendar } from './MarketHolidayCalendar'
export { WeeklyMarketCalendar } from './WeeklyMarketCalendar'
```

- [ ] **Step 3: 타입 검사**

```bash
npm run typecheck
```

오류 없이 통과해야 함.

- [ ] **Step 4: 커밋**

```bash
git add widgets/market-holiday-calendar/WeeklyMarketCalendar.tsx widgets/market-holiday-calendar/index.ts
git commit -m "feat(market-holiday-calendar): 주간 달력 컴포넌트 추가"
```

---

### Task 3: 대시보드 교체

**Files:**
- Modify: `app/(main)/dashboard/page.tsx`
- Modify: `widgets/dashboard/DashboardOverview.tsx`
- Modify: `widgets/dashboard/DashboardEmpty.tsx`

**Interfaces:**
- Consumes: `WeeklyMarketCalendar` from `@widgets/market-holiday-calendar`
- `DashboardOverview` new Props: `{ holidays: string[]; initialWeekStartDate: string; accountIds: string[] }`
- `DashboardEmpty` new Props: `{ holidays: string[]; initialWeekStartDate: string }`

- [ ] **Step 1: page.tsx — weekStartDate 계산 및 props 갱신**

`app/(main)/dashboard/page.tsx` 전체를 다음으로 교체:

```tsx
import { getAuthToken } from '@shared/lib/auth/token'
import { getMonthlyHolidays } from '@entities/market'
import { getCachedAccounts } from '@shared/lib/cache/cached-api'
import { DashboardEmpty } from '@widgets/dashboard/DashboardEmpty'
import { DashboardOverview } from '@widgets/dashboard/DashboardOverview'
import type { Account } from '@entities/account'

function pad(n: number) { return String(n).padStart(2, '0') }

function getWeekStartDate(): string {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  now.setDate(now.getDate() - now.getDay()) // 이번 주 일요일
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export default async function DashboardPage() {
  const token = await getAuthToken()

  const now = new Date()
  const calendarYear = now.getFullYear()
  const calendarMonth = now.getMonth() + 1
  const initialWeekStartDate = getWeekStartDate()

  let accounts: Account[] = []
  let holidays: string[] = []

  if (token) {
    try { accounts = await getCachedAccounts(token) } catch {}
    try { holidays = await getMonthlyHolidays(calendarYear, calendarMonth, token) } catch {}
  }

  if (accounts.length === 0) {
    return (
      <DashboardEmpty
        holidays={holidays}
        initialWeekStartDate={initialWeekStartDate}
      />
    )
  }

  return (
    <DashboardOverview
      holidays={holidays}
      initialWeekStartDate={initialWeekStartDate}
      accountIds={accounts.map(a => a.id)}
    />
  )
}
```

- [ ] **Step 2: DashboardOverview.tsx — 달력 교체**

`widgets/dashboard/DashboardOverview.tsx` 전체를 다음으로 교체:

```tsx
import { PageHeader } from '@widgets/page-header'
import { WeeklyMarketCalendar } from '@widgets/market-holiday-calendar'
import { NewAccountButton } from '@features/account/create-account'
import { MarketChartCard } from '@widgets/dashboard/MarketChartCard'
import { MARKET_CHART_CATEGORIES } from '@widgets/dashboard/marketChartCategories'
import { FearGreedSection } from '@widgets/fear-greed-card'

interface Props {
  holidays: string[]
  initialWeekStartDate: string
  accountIds: string[]
}

export function DashboardOverview({ holidays, initialWeekStartDate, accountIds }: Props) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">
        <PageHeader
          eyebrow="Dashboard"
          title="대시보드"
          actions={
            <NewAccountButton className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--r-md)] bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors disabled:opacity-60">
              계좌 등록
            </NewAccountButton>
          }
        />
        {/* Row 1: 달력 | CNN 공탐 | 크립토 공탐 */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <WeeklyMarketCalendar
            holidays={holidays}
            initialWeekStartDate={initialWeekStartDate}
            accountIds={accountIds}
          />
          <FearGreedSection />
        </div>
        {/* Row 2: 트레이딩뷰 차트 3개 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {MARKET_CHART_CATEGORIES.map((category) => (
            <MarketChartCard key={category.title} category={category} />
          ))}
        </div>
      </div>

      {/* Mobile */}
      <div className="lg:hidden">
        <div className="mb-4">
          <WeeklyMarketCalendar
            holidays={holidays}
            initialWeekStartDate={initialWeekStartDate}
            accountIds={accountIds}
          />
        </div>
        <div className="flex flex-col gap-4 mb-4">
          <FearGreedSection />
        </div>
        <div className="flex flex-col gap-4 mb-4">
          {MARKET_CHART_CATEGORIES.map((category) => (
            <MarketChartCard key={category.title} category={category} />
          ))}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 3: DashboardEmpty.tsx — 달력 교체**

`widgets/dashboard/DashboardEmpty.tsx`에서 두 곳의 `MarketHolidayCalendar` 사용부를 `WeeklyMarketCalendar`로 교체한다.

import 변경 (기존 `MarketHolidayCalendar` import 삭제, 아래로 교체):

```tsx
import { WeeklyMarketCalendar } from '@widgets/market-holiday-calendar'
```

Props 인터페이스 변경:

```tsx
interface Props {
  holidays: string[]
  initialWeekStartDate: string
}
```

함수 시그니처 변경:

```tsx
export function DashboardEmpty({ holidays, initialWeekStartDate }: Props) {
```

desktop Row 2 달력 (`line 58`):

```tsx
<WeeklyMarketCalendar
  holidays={holidays}
  initialWeekStartDate={initialWeekStartDate}
  accountIds={[]}
/>
```

mobile 달력 (`line 93`):

```tsx
<WeeklyMarketCalendar
  holidays={holidays}
  initialWeekStartDate={initialWeekStartDate}
  accountIds={[]}
/>
```

- [ ] **Step 4: 타입 검사**

```bash
npm run typecheck
```

오류 없이 통과해야 함.

- [ ] **Step 5: 커밋**

```bash
git add "app/(main)/dashboard/page.tsx" widgets/dashboard/DashboardOverview.tsx widgets/dashboard/DashboardEmpty.tsx
git commit -m "feat(dashboard): 월 달력 → 주간 거래 달력으로 교체"
```
