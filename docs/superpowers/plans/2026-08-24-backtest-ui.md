# 백테스트 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** kista-api의 신규 백테스트 실행 API(`GET /api/backtest`)를 소비하는 `/backtest` 화면을 kista-ui에 추가한다 — 3전략(INFINITE/PRIVACY/VR) 파라미터 입력 폼, 자산곡선 차트, 성과 요약, 해석 주의사항을 표시.

**Architecture:** 표준 FSD 계층(`entities/backtest` → `features/backtest/run-backtest` → `widgets/backtest` → `app/(main)/backtest`). 실행은 버튼 클릭시에만(`useMutation`), 계좌·SSR prefetch 무관. 자산곡선 차트 렌더링은 `widgets/stats-overview/EquityCurveChart`에서 `shared/ui/EquityLineChart`로 승격해 재사용한다.

**Tech Stack:** Next.js 16 App Router, TypeScript, TanStack Query, recharts, shadcn/ui(Base UI Select), Tailwind CSS, vitest + @testing-library/react

**Spec:** `docs/superpowers/specs/2026-08-24-backtest-ui-design.md`

## Global Constraints

- 싱글 쿼트, 세미콜론 없음, import 중괄호 공백 유지 (기존 파일 포맷 일괄 변경 금지)
- 인라인 `style={{ ... }}` 금지 — CSS 토큰 값·픽셀 계산 예외만 허용
- `any` 금지 — 제네릭·`?.`·`??` 사용
- 서버 상태를 `useState`에 복사하지 않는다 — React Query가 SSOT
- Client Component에서 직접 kista-api 호출 금지 — Route Handler 경유
- feature/widget 슬라이스끼리 cross-import 금지 (widget 화이트리스트 예외 있음, 이 계획엔 해당 없음)
- 커밋 메시지는 한글, author `narafu <narafu@kakao.com>` 확인, `git push`는 사용자 명시 요청시만
- 코드 변경은 커밋 직전 리뷰어 검수 필수(이 계획 실행 프레임워크가 태스크별로 처리)
- 기본 검증은 `npm run typecheck` (lint는 신뢰 불가)

---

## Task 1: `entities/backtest` — 타입·API·mutation 훅

**Files:**
- Create: `entities/backtest/model/types.ts`
- Create: `entities/backtest/api/index.ts`
- Create: `entities/backtest/api/index.test.ts`
- Create: `entities/backtest/hooks/useBacktestMutation.ts`
- Create: `entities/backtest/index.ts`

**Interfaces:**
- Consumes: `@shared/lib/api-client`의 `fetchEither<T>(path, options, token?)`
- Produces: `BacktestType`, `BacktestParams`, `BacktestResult`, `BacktestSummary`, `BacktestPoint` 타입; `getBacktest(params, token?)`; `useBacktestMutation()` — 이후 Task 3에서 그대로 소비

- [ ] **Step 1: 타입 정의**

`entities/backtest/model/types.ts`:
```ts
export type BacktestType = 'INFINITE' | 'PRIVACY' | 'VR'

export interface BacktestParams {
  type: BacktestType
  ticker: string
  from: string
  to: string
  seed: number
  divisionCount?: number
  vrBandWidth?: number
  vrIntervalWeeks?: number
  vrRecurringAmount?: number
  vrInitialValue?: number
}

export interface BacktestPoint {
  date: string
  totalAsset: number
  principal: number
}

export interface BacktestSummary {
  finalAsset: number
  totalInvested: number
  totalReturnRate: number
  cagr: number | null
  mdd: number
  tradeCount: number
  cycleCount: number
}

export interface BacktestResult {
  points: BacktestPoint[]
  summary: BacktestSummary
  warnings: string[]
}
```

- [ ] **Step 2: 실패하는 API 테스트 작성**

`entities/backtest/api/index.test.ts`:
```ts
import { describe, expect, it, vi, beforeEach } from 'vitest'

const fetchEitherMock = vi.fn()

vi.mock('@shared/lib/api-client', () => ({
  fetchEither: (...args: unknown[]) => fetchEitherMock(...args),
}))

describe('backtest api', () => {
  beforeEach(() => {
    fetchEitherMock.mockReset()
  })

  it('getBacktest builds query string with required params only', async () => {
    const { getBacktest } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({ points: [], summary: {}, warnings: [] })

    await getBacktest({
      type: 'INFINITE',
      ticker: 'TQQQ',
      from: '2026-01-01',
      to: '2026-06-01',
      seed: 10000,
    })

    expect(fetchEitherMock).toHaveBeenCalledWith(
      '/api/backtest?type=INFINITE&ticker=TQQQ&from=2026-01-01&to=2026-06-01&seed=10000',
      { method: 'GET' },
      undefined
    )
  })

  it('getBacktest includes VR-only params when provided', async () => {
    const { getBacktest } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({ points: [], summary: {}, warnings: [] })

    await getBacktest({
      type: 'VR',
      ticker: 'TQQQ',
      from: '2026-01-01',
      to: '2026-06-01',
      seed: 10000,
      vrBandWidth: 15,
      vrIntervalWeeks: 4,
      vrRecurringAmount: 0,
      vrInitialValue: 5000,
    })

    expect(fetchEitherMock).toHaveBeenCalledWith(
      '/api/backtest?type=VR&ticker=TQQQ&from=2026-01-01&to=2026-06-01&seed=10000&vrBandWidth=15&vrIntervalWeeks=4&vrRecurringAmount=0&vrInitialValue=5000',
      { method: 'GET' },
      undefined
    )
  })
})
```

- [ ] **Step 3: 테스트 실행 → 실패 확인**

Run: `npx vitest run entities/backtest/api/index.test.ts`
Expected: FAIL (모듈 `entities/backtest/api/index.ts` 없음)

- [ ] **Step 4: API 함수 구현**

`entities/backtest/api/index.ts`:
```ts
import { fetchEither } from '@shared/lib/api-client'
import type { BacktestParams, BacktestResult } from '../model/types'

export async function getBacktest(params: BacktestParams, token?: string): Promise<BacktestResult> {
  const q = new URLSearchParams({
    type: params.type,
    ticker: params.ticker,
    from: params.from,
    to: params.to,
    seed: String(params.seed),
  })
  if (params.divisionCount != null) q.set('divisionCount', String(params.divisionCount))
  if (params.vrBandWidth != null) q.set('vrBandWidth', String(params.vrBandWidth))
  if (params.vrIntervalWeeks != null) q.set('vrIntervalWeeks', String(params.vrIntervalWeeks))
  if (params.vrRecurringAmount != null) q.set('vrRecurringAmount', String(params.vrRecurringAmount))
  if (params.vrInitialValue != null) q.set('vrInitialValue', String(params.vrInitialValue))
  return fetchEither<BacktestResult>(`/api/backtest?${q}`, { method: 'GET' }, token)
}
```

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npx vitest run entities/backtest/api/index.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: mutation 훅 작성**

`entities/backtest/hooks/useBacktestMutation.ts`:
```ts
'use client'

import { useMutation } from '@tanstack/react-query'
import { getBacktest } from '../api'
import type { BacktestParams, BacktestResult } from '../model/types'

export function useBacktestMutation() {
  return useMutation<BacktestResult, unknown, BacktestParams>({
    mutationFn: (params) => getBacktest(params),
  })
}
```

- [ ] **Step 7: 배럴 파일 작성**

`entities/backtest/index.ts`:
```ts
export type { BacktestType, BacktestParams, BacktestPoint, BacktestSummary, BacktestResult } from './model/types'
export { getBacktest } from './api'
export { useBacktestMutation } from './hooks/useBacktestMutation'
```

- [ ] **Step 8: typecheck**

Run: `npm run typecheck`
Expected: 에러 없음 (신규 파일만 추가, 기존 코드 영향 없음)

- [ ] **Step 9: 커밋**

```bash
git add entities/backtest
git commit -m "$(cat <<'EOF'
feat(backtest): 백테스트 API·mutation 훅 추가

kista-api GET /api/backtest 소비하는 entities 레이어 — 타입/쿼리스트링 빌더/useMutation
EOF
)"
```

---

## Task 2: `shared/ui/EquityLineChart` 승격 + `EquityCurveChart` 리팩터

**Files:**
- Create: `shared/ui/EquityLineChart.tsx`
- Modify: `widgets/stats-overview/EquityCurveChart.tsx`

**Interfaces:**
- Consumes: 없음 (recharts, `@shared/lib/format`의 `fmtMonthDay`/`fmtDate`)
- Produces: `EquityLineChart({ rows, assetLabel?, principalLabel? })` — `rows: { date: string; asset: number; principal: number }[]`. Task 5(`widgets/backtest`)가 그대로 소비

이 작업은 기존 동작 회귀 확인이 핵심이라 "테스트 먼저 작성" 대신 리팩터 전/후 수동 비교로 검증한다(원본 `EquityCurveChart.tsx`에 전용 유닛 테스트가 없음 — `grep -rn "EquityCurveChart" widgets/stats-overview/*.test.tsx`로 재확인 후 진행).

- [ ] **Step 1: 회귀 테스트 부재 재확인**

Run: `find widgets/stats-overview -iname "*EquityCurveChart*test*"`
Expected: 결과 없음 (전용 테스트 파일 없음을 재확인 — 있다면 이 스텝에서 발견하고 리팩터 후 그 테스트도 통과시켜야 함)

- [ ] **Step 2: `EquityLineChart` 신규 작성**

`shared/ui/EquityLineChart.tsx`:
```tsx
'use client'

// eslint-disable-next-line react-doctor/prefer-dynamic-import
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { fmtMonthDay, fmtDate } from '@shared/lib/format'

export interface EquityLineChartRow {
  date: string
  asset: number
  principal: number
}

interface Props {
  rows: EquityLineChartRow[]
  assetLabel?: string
  principalLabel?: string
}

export function EquityLineChart({ rows, assetLabel = '내 자산', principalLabel = '투입 원금' }: Props) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">표시할 자산 추이 데이터가 없습니다.</p>
  }

  return (
    <div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pb-3">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-3.5 rounded-full" style={{ backgroundColor: 'var(--chart-1)' }} />
          {assetLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0 w-3.5 border-t-2 border-dashed" style={{ borderColor: 'var(--muted-foreground)' }} />
          {principalLabel}
        </span>
      </div>
      <div className="h-[240px] w-full sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) => fmtMonthDay(value)}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={32} domain={['auto', 'auto']} />
            <Tooltip
              labelFormatter={(label) => fmtDate(String(label))}
              formatter={(value, name) => [typeof value === 'number' ? value.toFixed(1) : String(value), String(name)]}
              contentStyle={{
                fontSize: 12,
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
                borderRadius: 6,
              }}
            />
            <Line type="monotone" dataKey="principal" name={principalLabel} stroke="var(--muted-foreground)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
            <Line type="monotone" dataKey="asset" name={assetLabel} stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
```

주의: `style={{ backgroundColor: ... }}`/`style={{ borderColor: ... }}`는 원본 `EquityCurveChart.tsx`에 이미 있던 CSS 토큰 인라인 style 그대로 이동한 것 — Global Constraints의 인라인 style 금지 예외(CSS 토큰 값)에 해당하므로 위반 아님.

- [ ] **Step 3: `EquityCurveChart.tsx`를 얇은 wrapper로 리팩터**

`widgets/stats-overview/EquityCurveChart.tsx` 전체를 다음으로 교체:
```tsx
'use client'

import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@shared/lib/utils'
import { EquityLineChart } from '@shared/ui/EquityLineChart'
import type { StrategyTypeStats } from '@entities/stats'
import type { NormalizedRow } from './lib/normalizeEquityCurve'
import type { RangeKey } from './StatsOverview'
import { StrategyTypeFilterToggle } from './StrategyTypeFilterToggle'

interface Props {
  rows: NormalizedRow[]
  range: RangeKey
  onRangeChange: (range: RangeKey) => void
  strategyTypes: StrategyTypeStats[]
  strategyTypeFilter?: string
  onStrategyTypeFilterChange: (type: string | undefined) => void
}

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1Y' },
  { value: 'ALL', label: '전체' },
]

function ToggleButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-9 w-full rounded px-2 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent',
      )}
    >
      {children}
    </button>
  )
}

export function EquityCurveChart({
  rows,
  range,
  onRangeChange,
  strategyTypes,
  strategyTypeFilter,
  onStrategyTypeFilterChange,
}: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base lg:text-lg">누적 자산 추이</CardTitle>
          <StrategyTypeFilterToggle
            strategyTypes={strategyTypes}
            strategyTypeFilter={strategyTypeFilter}
            onStrategyTypeFilterChange={onStrategyTypeFilterChange}
          />
        </div>
        <div className="grid w-full grid-cols-5 rounded-md border border-border p-0.5 sm:w-auto sm:max-w-sm">
          {RANGE_OPTIONS.map((option) => (
            <ToggleButton key={option.value} active={range === option.value} onClick={() => onRangeChange(option.value)}>
              {option.label}
            </ToggleButton>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6 sm:pb-6">
        <EquityLineChart rows={rows} />
        <p className="mt-2 text-xs text-muted-foreground">
          전략에 배정된 예수금 기준 근사치입니다. 수수료는 반영되지 않습니다.
        </p>
      </CardContent>
    </Card>
  )
}
```

의도된 변화: 범례(내 자산/투입 원금 색상 표시)가 `CardHeader`에서 차트 바로 위(`CardContent` 상단, `EquityLineChart` 내부)로 이동한다 — 시각적으로 자연스러운 위치 조정이며 정보 손실 없음.

- [ ] **Step 4: typecheck + 관련 테스트**

Run: `npm run typecheck`
Expected: 에러 없음

Run: `npx vitest run widgets/stats-overview`
Expected: 기존 `StatsOverview.test.tsx`, `normalizeEquityCurve.test.ts` 모두 PASS (구조 변경이 이 테스트들이 검증하는 데이터 흐름에 영향 없음 — 실패 시 무엇이 깨졌는지 확인 후 수정)

- [ ] **Step 5: `/stats` 페이지 수동 확인**

Run: `npm run dev` (이미 떠 있지 않다면) 후 `http://localhost:3000/stats`에서 "누적 자산 추이" 카드가 이전과 동일하게 렌더되는지 브라우저로 확인. 문제 없으면 dev 서버는 계속 사용(재기동 반복 금지).

- [ ] **Step 6: 커밋**

```bash
git add shared/ui/EquityLineChart.tsx widgets/stats-overview/EquityCurveChart.tsx
git commit -m "$(cat <<'EOF'
refactor(stats): 자산곡선 차트를 shared/ui/EquityLineChart로 승격

widgets/stats-overview 전용 recharts 렌더링을 재사용 가능한 프레젠테이션 컴포넌트로 추출
EOF
)"
```

---

## Task 3: `features/backtest/run-backtest` — 폼 상태 훅

**Files:**
- Create: `features/backtest/run-backtest/model/useBacktestForm.ts`
- Create: `features/backtest/run-backtest/model/useBacktestForm.test.ts`

**Interfaces:**
- Consumes: `useMeta()`(`@entities/meta`, `meta.strategyTypes: StrategyTypeMeta[]` — `code`/`availableTickers`/`divisionCounts`), `useBacktestMutation()`(Task 1)
- Produces: `useBacktestForm(): UseBacktestFormResult` — Task 4(`BacktestForm.tsx`)와 Task 5(`BacktestPageContent.tsx`)가 그대로 소비. 필드: `meta`, `type`/`setType`, `ticker`/`setTicker`/`availableTickers`, `from`/`setFrom`, `to`/`setTo`, `seed`/`setSeed`, `divisionCount`/`setDivisionCount`/`divisionCountOptions`, `vrBandWidth`/`setVrBandWidth`, `vrIntervalWeeks`/`setVrIntervalWeeks`, `vrRecurringMode`/`setVrRecurringMode`, `vrRecurringAmountAbs`/`setVrRecurringAmountAbs`, `vrInitialValue`/`setVrInitialValue`, `submitDisabledReason: string | null`, `run(): void`, `result: BacktestResult | undefined`, `isLoading: boolean`, `errorMessage: string | null`

- [ ] **Step 1: 실패하는 테스트 작성**

`features/backtest/run-backtest/model/useBacktestForm.test.ts`:
```ts
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

const mutateMock = vi.fn()

vi.mock('@entities/backtest', () => ({
  useBacktestMutation: () => ({ mutate: mutateMock, data: undefined, error: null, isPending: false }),
}))

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    meta: {
      strategyTypes: [
        { code: 'INFINITE', availableTickers: ['MAGX', 'USD', 'TQQQ', 'SOXL'], divisionCounts: [20, 30, 40] },
        { code: 'PRIVACY', availableTickers: ['SOXL'], divisionCounts: [] },
        { code: 'VR', availableTickers: ['TQQQ'], divisionCounts: [] },
      ],
    },
  }),
}))

describe('useBacktestForm', () => {
  beforeEach(() => {
    mutateMock.mockReset()
  })

  it('전략 타입 전환 시 종목·VR 필드가 새 타입 기본값으로 초기화된다', async () => {
    const { useBacktestForm } = await import('./useBacktestForm')
    const { result } = renderHook(() => useBacktestForm())

    act(() => {
      result.current.setVrBandWidth(15)
    })
    act(() => {
      result.current.setType('VR')
    })

    expect(result.current.ticker).toBe('TQQQ')
    expect(result.current.vrBandWidth).toBeNull()
  })

  it('시드가 없으면 제출을 막는다', async () => {
    const { useBacktestForm } = await import('./useBacktestForm')
    const { result } = renderHook(() => useBacktestForm())

    act(() => {
      result.current.setFrom('2026-01-01')
      result.current.setTo('2026-06-01')
      result.current.setDivisionCount(20)
    })

    expect(result.current.submitDisabledReason).toBe('시드는 0보다 커야 합니다')
  })

  it('시작일이 종료일보다 늦으면 제출을 막는다', async () => {
    const { useBacktestForm } = await import('./useBacktestForm')
    const { result } = renderHook(() => useBacktestForm())

    act(() => {
      result.current.setSeed(10000)
      result.current.setDivisionCount(20)
      result.current.setFrom('2026-06-01')
      result.current.setTo('2026-01-01')
    })

    expect(result.current.submitDisabledReason).toBe('시작일이 종료일보다 늦을 수 없습니다')
  })

  it('VR은 밴드폭·주기·초기V값이 모두 있어야 제출 가능하다', async () => {
    const { useBacktestForm } = await import('./useBacktestForm')
    const { result } = renderHook(() => useBacktestForm())

    act(() => {
      result.current.setType('VR')
      result.current.setSeed(10000)
      result.current.setFrom('2026-01-01')
      result.current.setTo('2026-06-01')
    })
    expect(result.current.submitDisabledReason).toBe('VR 밴드 폭은 0보다 커야 합니다')

    act(() => {
      result.current.setVrBandWidth(15)
      result.current.setVrIntervalWeeks(4)
    })
    expect(result.current.submitDisabledReason).toBe('VR 초기 V값은 0보다 커야 합니다')

    act(() => {
      result.current.setVrInitialValue(5000)
    })
    expect(result.current.submitDisabledReason).toBeNull()
  })

  it('run()은 유효할 때만 mutate를 호출한다', async () => {
    const { useBacktestForm } = await import('./useBacktestForm')
    const { result } = renderHook(() => useBacktestForm())

    act(() => {
      result.current.run()
    })
    expect(mutateMock).not.toHaveBeenCalled()

    act(() => {
      result.current.setSeed(10000)
      result.current.setFrom('2026-01-01')
      result.current.setTo('2026-06-01')
      result.current.setDivisionCount(20)
    })
    act(() => {
      result.current.run()
    })
    expect(mutateMock).toHaveBeenCalledWith({
      type: 'INFINITE',
      ticker: 'MAGX',
      from: '2026-01-01',
      to: '2026-06-01',
      seed: 10000,
      divisionCount: 20,
      vrBandWidth: undefined,
      vrIntervalWeeks: undefined,
      vrRecurringAmount: undefined,
      vrInitialValue: undefined,
    })
  })
})
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npx vitest run features/backtest/run-backtest/model/useBacktestForm.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 훅 구현**

`features/backtest/run-backtest/model/useBacktestForm.ts`:
```ts
'use client'

import { useMemo, useState } from 'react'
import { apiMsg } from '@shared/lib/api-client'
import { useMeta } from '@entities/meta'
import { useBacktestMutation } from '@entities/backtest'
import type { BacktestParams, BacktestType } from '@entities/backtest'

type RecurringMode = 'DEPOSIT' | 'HOLD' | 'WITHDRAW'

export function useBacktestForm() {
  const { meta } = useMeta()
  const mutation = useBacktestMutation()

  const [type, setTypeState] = useState<BacktestType>('INFINITE')
  const [ticker, setTicker] = useState(
    meta.strategyTypes.find((t) => t.code === 'INFINITE')?.availableTickers[0] ?? ''
  )
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [seed, setSeed] = useState<number | null>(null)
  const [divisionCount, setDivisionCount] = useState<number | null>(null)
  const [vrBandWidth, setVrBandWidth] = useState<number | null>(null)
  const [vrIntervalWeeks, setVrIntervalWeeks] = useState<number | null>(null)
  const [vrRecurringMode, setVrRecurringMode] = useState<RecurringMode>('HOLD')
  const [vrRecurringAmountAbs, setVrRecurringAmountAbs] = useState<number | null>(null)
  const [vrInitialValue, setVrInitialValue] = useState<number | null>(null)

  const typeMeta = meta.strategyTypes.find((t) => t.code === type)
  const availableTickers = typeMeta?.availableTickers ?? []
  const divisionCountOptions = typeMeta?.divisionCounts ?? []

  function setType(next: BacktestType) {
    setTypeState(next)
    const nextMeta = meta.strategyTypes.find((t) => t.code === next)
    setTicker(nextMeta?.availableTickers[0] ?? '')
    setDivisionCount(null)
    setVrBandWidth(null)
    setVrIntervalWeeks(null)
    setVrRecurringMode('HOLD')
    setVrRecurringAmountAbs(null)
    setVrInitialValue(null)
  }

  const vrRecurringAmount =
    vrRecurringMode === 'HOLD' ? 0 : vrRecurringMode === 'WITHDRAW' ? -(vrRecurringAmountAbs ?? 0) : (vrRecurringAmountAbs ?? 0)

  const submitDisabledReason = useMemo(() => {
    if (!ticker) return '종목을 선택하세요'
    if (seed == null || seed <= 0) return '시드는 0보다 커야 합니다'
    if (!from || !to) return '기간을 선택하세요'
    if (from > to) return '시작일이 종료일보다 늦을 수 없습니다'
    if (type === 'INFINITE' && divisionCountOptions.length > 0 && divisionCount == null) {
      return '분할 수를 선택하세요'
    }
    if (type === 'VR') {
      if (vrBandWidth == null || vrBandWidth <= 0) return 'VR 밴드 폭은 0보다 커야 합니다'
      if (vrIntervalWeeks == null || vrIntervalWeeks <= 0) return 'VR 리밸런싱 주기는 1 이상이어야 합니다'
      if (vrInitialValue == null || vrInitialValue <= 0) return 'VR 초기 V값은 0보다 커야 합니다'
    }
    return null
  }, [ticker, seed, from, to, type, divisionCountOptions.length, divisionCount, vrBandWidth, vrIntervalWeeks, vrInitialValue])

  function buildParams(): BacktestParams {
    return {
      type,
      ticker,
      from,
      to,
      seed: seed as number,
      divisionCount: type === 'INFINITE' ? (divisionCount ?? undefined) : undefined,
      vrBandWidth: type === 'VR' ? (vrBandWidth ?? undefined) : undefined,
      vrIntervalWeeks: type === 'VR' ? (vrIntervalWeeks ?? undefined) : undefined,
      vrRecurringAmount: type === 'VR' ? vrRecurringAmount : undefined,
      vrInitialValue: type === 'VR' ? (vrInitialValue ?? undefined) : undefined,
    }
  }

  function run() {
    if (submitDisabledReason) return
    mutation.mutate(buildParams())
  }

  return {
    meta,
    type,
    setType,
    ticker,
    setTicker,
    availableTickers,
    from,
    setFrom,
    to,
    setTo,
    seed,
    setSeed,
    divisionCount,
    setDivisionCount,
    divisionCountOptions,
    vrBandWidth,
    setVrBandWidth,
    vrIntervalWeeks,
    setVrIntervalWeeks,
    vrRecurringMode,
    setVrRecurringMode,
    vrRecurringAmountAbs,
    setVrRecurringAmountAbs,
    vrInitialValue,
    setVrInitialValue,
    submitDisabledReason,
    run,
    result: mutation.data,
    isLoading: mutation.isPending,
    errorMessage: mutation.error ? apiMsg(mutation.error, '백테스트 실행에 실패했습니다. 잠시 후 다시 시도해주세요') : null,
  }
}

export type UseBacktestFormResult = ReturnType<typeof useBacktestForm>
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npx vitest run features/backtest/run-backtest/model/useBacktestForm.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: typecheck**

Run: `npm run typecheck`
Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add features/backtest/run-backtest/model
git commit -m "$(cat <<'EOF'
feat(backtest): 백테스트 폼 상태 훅 추가

전략 타입 전환 시 종목/VR 필드 초기화, 최소 검증(submitDisabledReason), useMutation 트리거
EOF
)"
```

---

## Task 4: `features/backtest/run-backtest` — `BacktestForm` UI

**Files:**
- Create: `features/backtest/run-backtest/BacktestForm.tsx`
- Create: `features/backtest/run-backtest/index.ts`

**Interfaces:**
- Consumes: `UseBacktestFormResult`(Task 3, prop으로 주입받음 — 이 컴포넌트는 훅을 직접 호출하지 않는다), `@shared/ui/selection-card`의 `SelectionCard`, `@shared/ui/Spinner`의 `Spinner`, shadcn `Button`/`Card`/`CardContent`/`Input`/`Label`/`Select`류
- Produces: `BacktestForm({ form: UseBacktestFormResult })` — Task 5(`BacktestPageContent`)가 `useBacktestForm()` 결과를 그대로 넘겨 사용

이 컴포넌트는 순수 프레젠테이션(상태는 Task 3 훅이 소유)이라 별도 유닛 테스트 없이 typecheck + 수동 브라우저 확인으로 검증한다(코드베이스의 다른 폼 섹션 컴포넌트들도 동일 패턴 — 로직은 훅 테스트로, 마크업은 수동 확인으로 검증).

- [ ] **Step 1: `BacktestForm.tsx` 작성**

`features/backtest/run-backtest/BacktestForm.tsx`:
```tsx
'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@shared/ui/Spinner'
import { SelectionCard } from '@shared/ui/selection-card'
import type { BacktestType } from '@entities/backtest'
import type { UseBacktestFormResult } from './model/useBacktestForm'

interface Props {
  form: UseBacktestFormResult
}

const RECURRING_MODE_LABEL: Record<'DEPOSIT' | 'HOLD' | 'WITHDRAW', string> = {
  DEPOSIT: '+ 적립',
  HOLD: '거치',
  WITHDRAW: '- 인출',
}

export function BacktestForm({ form }: Props) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5 pt-6">
        <div>
          <Label className="mb-2 block text-sm font-bold">매매 전략</Label>
          <div className="grid grid-cols-3 gap-2.5">
            {form.meta.strategyTypes.map((t) => (
              <SelectionCard
                key={t.code}
                selected={form.type === t.code}
                showIndicator
                onClick={() => form.setType(t.code as BacktestType)}
                disabled={form.isLoading}
                className="px-3 py-3 text-center text-sm font-[800]"
              >
                {t.code}
              </SelectionCard>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-2 block text-sm font-bold">종목</Label>
          <Select
            items={form.availableTickers.map((code) => ({ value: code, label: code }))}
            value={form.ticker}
            onValueChange={(value) => { if (value) form.setTicker(value) }}
          >
            <SelectTrigger aria-label="종목" className="w-full" disabled={form.isLoading || form.availableTickers.length <= 1}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {form.availableTickers.map((code) => (
                <SelectItem key={code} value={code}>{code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-2 block text-sm font-bold">시작일</Label>
            <Input type="date" value={form.from} onChange={(e) => form.setFrom(e.target.value)} disabled={form.isLoading} />
          </div>
          <div>
            <Label className="mb-2 block text-sm font-bold">종료일</Label>
            <Input type="date" value={form.to} onChange={(e) => form.setTo(e.target.value)} disabled={form.isLoading} />
          </div>
        </div>

        <div>
          <Label className="mb-2 block text-sm font-bold">시드 (USD)</Label>
          <Input
            type="number"
            min={0}
            value={form.seed ?? ''}
            onChange={(e) => form.setSeed(e.target.value === '' ? null : Number(e.target.value))}
            disabled={form.isLoading}
            placeholder="10000"
          />
        </div>

        {form.type === 'INFINITE' && form.divisionCountOptions.length > 0 && (
          <div>
            <Label className="mb-2 block text-sm font-bold">분할 수</Label>
            <div className="flex gap-2">
              {form.divisionCountOptions.map((n) => (
                <SelectionCard
                  key={n}
                  selected={form.divisionCount === n}
                  onClick={() => form.setDivisionCount(n)}
                  disabled={form.isLoading}
                  className="flex-1 py-2.5 text-center text-sm font-bold"
                >
                  {n}분할
                </SelectionCard>
              ))}
            </div>
          </div>
        )}

        {form.type === 'VR' && (
          <div className="flex flex-col gap-4 rounded-[var(--r-sm)] border border-border p-4">
            <Label className="text-sm font-bold">밸류 리밸런싱 설정</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-2 block text-xs text-muted-foreground">밴드 폭(%)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.vrBandWidth ?? ''}
                  onChange={(e) => form.setVrBandWidth(e.target.value === '' ? null : Number(e.target.value))}
                  disabled={form.isLoading}
                  placeholder="15"
                />
              </div>
              <div>
                <Label className="mb-2 block text-xs text-muted-foreground">리밸런싱 주기(주)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.vrIntervalWeeks ?? ''}
                  onChange={(e) => form.setVrIntervalWeeks(e.target.value === '' ? null : Number(e.target.value))}
                  disabled={form.isLoading}
                  placeholder="4"
                />
              </div>
            </div>
            <div>
              <Label className="mb-2 block text-xs text-muted-foreground">초기 V값(USD)</Label>
              <Input
                type="number"
                min={0}
                value={form.vrInitialValue ?? ''}
                onChange={(e) => form.setVrInitialValue(e.target.value === '' ? null : Number(e.target.value))}
                disabled={form.isLoading}
                placeholder="10000"
              />
            </div>
            <div>
              <Label className="mb-2 block text-xs text-muted-foreground">적립(+)/거치/인출(-)</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['DEPOSIT', 'HOLD', 'WITHDRAW'] as const).map((mode) => (
                  <SelectionCard
                    key={mode}
                    selected={form.vrRecurringMode === mode}
                    onClick={() => form.setVrRecurringMode(mode)}
                    disabled={form.isLoading}
                    className="py-2.5 text-center text-sm font-bold"
                  >
                    {RECURRING_MODE_LABEL[mode]}
                  </SelectionCard>
                ))}
              </div>
              {form.vrRecurringMode !== 'HOLD' && (
                <Input
                  type="number"
                  min={0}
                  className="mt-2"
                  value={form.vrRecurringAmountAbs ?? ''}
                  onChange={(e) => form.setVrRecurringAmountAbs(e.target.value === '' ? null : Number(e.target.value))}
                  disabled={form.isLoading}
                  placeholder="0"
                />
              )}
            </div>
          </div>
        )}

        {form.submitDisabledReason && (
          <p className="text-sm font-semibold text-[var(--warn)]">{form.submitDisabledReason}</p>
        )}
        {form.errorMessage && (
          <p className="text-sm font-semibold text-[var(--status-error)]">{form.errorMessage}</p>
        )}

        <Button
          type="button"
          onClick={form.run}
          disabled={form.isLoading || !!form.submitDisabledReason}
          className="h-11 gap-2 text-sm font-[800]"
        >
          {form.isLoading ? (
            <>
              <Spinner size={14} />
              실행 중...
            </>
          ) : '실행'}
        </Button>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: 배럴 파일 작성**

`features/backtest/run-backtest/index.ts`:
```ts
export { BacktestForm } from './BacktestForm'
export { useBacktestForm } from './model/useBacktestForm'
export type { UseBacktestFormResult } from './model/useBacktestForm'
```

- [ ] **Step 3: typecheck**

Run: `npm run typecheck`
Expected: 에러 없음 (아직 어느 페이지도 `BacktestForm`을 렌더하지 않아 미사용 경고만 있다면 무시 — Task 5에서 소비)

- [ ] **Step 4: 커밋**

```bash
git add features/backtest/run-backtest/BacktestForm.tsx features/backtest/run-backtest/index.ts
git commit -m "$(cat <<'EOF'
feat(backtest): 백테스트 입력 폼 컴포넌트 추가

전략/종목/기간/시드 공통 입력 + INFINITE 분할수·VR 전용 파라미터 조건부 섹션
EOF
)"
```

---

## Task 5: `widgets/backtest` — 결과 표시 + 페이지 조합

**Files:**
- Create: `widgets/backtest/BacktestSummaryCards.tsx`
- Create: `widgets/backtest/BacktestWarnings.tsx`
- Create: `widgets/backtest/BacktestPageContent.tsx`
- Create: `widgets/backtest/index.ts`

**Interfaces:**
- Consumes: `useBacktestForm`/`BacktestForm`(Task 3·4, `@features/backtest/run-backtest`), `EquityLineChart`(Task 2, `@shared/ui/EquityLineChart`), `KpiCard`(`@widgets/kpi-card`), `fmtUsd`/`fmtSignedPercent`(`@shared/lib/format`), `BacktestSummary`/`BacktestResult` 타입(`@entities/backtest`)
- Produces: `BacktestPageContent()` — Task 6(`app/(main)/backtest/page.tsx`)가 그대로 렌더

- [ ] **Step 1: `BacktestSummaryCards.tsx` 작성**

`widgets/backtest/BacktestSummaryCards.tsx`:
```tsx
import { KpiCard } from '@widgets/kpi-card'
import { fmtUsd, fmtSignedPercent } from '@shared/lib/format'
import type { BacktestSummary } from '@entities/backtest'

interface Props {
  summary: BacktestSummary
}

export function BacktestSummaryCards({ summary }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <KpiCard label="최종 자산" value={`$${fmtUsd(summary.finalAsset)}`} />
      <KpiCard label="누적 수익률" value={fmtSignedPercent(summary.totalReturnRate)} />
      <KpiCard label="CAGR" value={fmtSignedPercent(summary.cagr)} />
      <KpiCard label="MDD" value={fmtSignedPercent(summary.mdd)} />
      <KpiCard label="체결 건수" value={`${summary.tradeCount}건`} />
      <KpiCard label="사이클 수" value={`${summary.cycleCount}회`} />
    </div>
  )
}
```

- [ ] **Step 2: `BacktestWarnings.tsx` 작성**

`widgets/backtest/BacktestWarnings.tsx`:
```tsx
interface Props {
  warnings: string[]
}

export function BacktestWarnings({ warnings }: Props) {
  if (warnings.length === 0) return null

  return (
    <div className="flex flex-col gap-2 rounded-[var(--r-sm)] border border-[var(--warn)] bg-[var(--warn-bg)] p-4">
      <p className="text-sm font-bold text-[var(--warn)]">해석 시 유의사항</p>
      <ul className="flex flex-col gap-1.5 text-sm text-[var(--warn)]">
        {warnings.map((warning, index) => (
          <li key={index}>· {warning}</li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: `BacktestPageContent.tsx` 작성**

`widgets/backtest/BacktestPageContent.tsx`:
```tsx
'use client'

import { BacktestForm, useBacktestForm } from '@features/backtest/run-backtest'
import { EquityLineChart } from '@shared/ui/EquityLineChart'
import { BacktestSummaryCards } from './BacktestSummaryCards'
import { BacktestWarnings } from './BacktestWarnings'

export function BacktestPageContent() {
  const form = useBacktestForm()
  const result = form.result

  return (
    <div className="flex flex-col gap-5">
      <BacktestForm form={form} />
      {result && (
        <div className="flex flex-col gap-5">
          <BacktestSummaryCards summary={result.summary} />
          <div className="rounded-[var(--r-lg)] border border-border bg-card p-4 sm:p-6">
            <EquityLineChart
              rows={result.points.map((p) => ({ date: p.date, asset: p.totalAsset, principal: p.principal }))}
              assetLabel="총자산"
              principalLabel="투입 원금"
            />
          </div>
          <BacktestWarnings warnings={result.warnings} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 배럴 파일 작성**

`widgets/backtest/index.ts`:
```ts
export { BacktestPageContent } from './BacktestPageContent'
```

- [ ] **Step 5: typecheck**

Run: `npm run typecheck`
Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add widgets/backtest
git commit -m "$(cat <<'EOF'
feat(backtest): 백테스트 결과 표시 위젯 추가

성과 요약 KPI 카드, 해석 주의사항 안내, 폼+결과 조합 페이지 위젯
EOF
)"
```

---

## Task 6: `app/` — 라우트·프록시·사이드바·보호 경로

**Files:**
- Create: `app/api/backtest/route.ts`
- Create: `app/(main)/backtest/page.tsx`
- Modify: `proxy.ts:25`
- Modify: `widgets/layout/DesktopSidebar.tsx`
- Modify: `widgets/layout/MobileBottomNav.tsx`

**Interfaces:**
- Consumes: `createProxyRoute`(`@shared/lib/proxy/createProxyRoute`), `BacktestPageContent`(Task 5), `PageHeader`(`@widgets/page-header`)
- Produces: 없음 (최종 소비 지점)

- [ ] **Step 1: 프록시 라우트 작성**

`app/api/backtest/route.ts`:
```ts
import { createProxyRoute } from '@shared/lib/proxy/createProxyRoute'

export const { GET } = createProxyRoute({
  basePath: '/api/backtest',
})
```

- [ ] **Step 2: 페이지 작성**

`app/(main)/backtest/page.tsx`:
```tsx
import type { Metadata } from 'next'
import { BacktestPageContent } from '@widgets/backtest'
import { PageHeader } from '@widgets/page-header'

export const metadata: Metadata = {
  title: '백테스트 | KISTA',
}

export default function BacktestPage() {
  return (
    <>
      <PageHeader eyebrow="Backtest" title="백테스트" />
      <BacktestPageContent />
    </>
  )
}
```

- [ ] **Step 3: `PROTECTED_PREFIXES`에 `/backtest` 추가**

`proxy.ts:25`을 다음으로 교체:
```ts
const PROTECTED_PREFIXES = ['/accounts', '/strategies', '/stats', '/settings', '/benchmark', '/finance', '/backtest']
```

- [ ] **Step 4: 데스크탑 사이드바에 메뉴 추가**

`widgets/layout/DesktopSidebar.tsx`의 import 줄을 다음으로 교체:
```ts
import { LayoutDashboard, CreditCard, ListChecks, TrendingUp, Scale, FlaskConical, Wallet, Settings, LogOut, LogIn, ShieldCheck } from 'lucide-react'
```

`NAV_ITEMS` 배열을 다음으로 교체:
```ts
const NAV_ITEMS = [
  { href: '/dashboard',  label: '대시보드', icon: LayoutDashboard },
  { href: '/accounts',   label: '계좌',     icon: CreditCard },
  { href: '/strategies', label: '전략',     icon: ListChecks },
  { href: '/stats',      label: '통계',     icon: TrendingUp },
  { href: '/benchmark',  label: '벤치마크', icon: Scale },
  { href: '/backtest',   label: '백테스트', icon: FlaskConical },
  { href: '/finance',    label: '가계부',   icon: Wallet },
  { href: '/settings',   label: '설정',     icon: Settings },
]
```

- [ ] **Step 5: 모바일 하단 네비게이션에 메뉴 추가**

`widgets/layout/MobileBottomNav.tsx`의 아이콘 import에 `FlaskConical` 추가하고, 동일한 배열에 같은 위치(벤치마크 다음)로 `{ href: '/backtest', label: '백테스트', icon: FlaskConical }` 항목을 추가한다(파일 상단 import 문·배열 정의는 `DesktopSidebar.tsx`와 동일한 방식 — Step 4와 같은 자리에 같은 항목 추가).

- [ ] **Step 6: typecheck**

Run: `npm run typecheck`
Expected: 에러 없음

- [ ] **Step 7: 프로덕션 빌드 검증**

Run: `npm run build`
Expected: 빌드 성공, `/backtest` 라우트가 라우트 목록에 표시됨

- [ ] **Step 8: 수동 확인**

`npm run dev` (미기동시 실행) 후 브라우저로 `/backtest` 접속 — 로그인 상태에서 사이드바 "백테스트" 메뉴 클릭 → 폼 렌더 확인. 로그아웃 상태로 `/backtest` 직접 접속 시 `/login`으로 리다이렉트되는지 확인(`PROTECTED_PREFIXES` 적용 검증). kista-api가 로컬에 떠 있다면 실제 "실행" 버튼까지 눌러 결과 렌더 확인, 없다면 폼 UI·검증 메시지만 확인하고 실행 결과는 생략(메모리 제약 — `verify_local_api_constraint`).

- [ ] **Step 9: 커밋**

```bash
git add app/api/backtest "app/(main)/backtest/page.tsx" proxy.ts widgets/layout/DesktopSidebar.tsx widgets/layout/MobileBottomNav.tsx
git commit -m "$(cat <<'EOF'
feat(backtest): /backtest 라우트·프록시·사이드바 메뉴 연결

PROTECTED_PREFIXES에 /backtest 추가로 로그인 필요 처리
EOF
)"
```

---

## Task 7: 최종 검증

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 전체 타입체크**

Run: `npm run typecheck`
Expected: 에러 없음

- [ ] **Step 2: 전체 테스트 스위트**

Run: `npm run test:run`
Expected: 전체 PASS (Task 2에서 확인한 `widgets/stats-overview` 회귀 포함)

- [ ] **Step 3: README 드리프트 확인**

Run: `grep -n "백테스트\|backtest" README.md`
Expected: 사이드바 메뉴·라우트 목록이 README에 나열돼 있다면 `/backtest` 추가 — 없다면(현재 README 구조상 페이지 목록을 나열하지 않는다면) 변경 불필요, 무엇을 확인했는지만 기록

- [ ] **Step 4: 코드 리뷰**

`/code-review medium` 실행(diff 규모가 파일 10여개·수백 줄 수준) — 발견된 실제 결함은 이 자리에서 수정 후 재검증

- [ ] **Step 5: 최종 커밋**(리뷰에서 수정이 있었던 경우만)

```bash
git add -A
git commit -m "$(cat <<'EOF'
fix(backtest): 코드 리뷰 반영

EOF
)"
```
