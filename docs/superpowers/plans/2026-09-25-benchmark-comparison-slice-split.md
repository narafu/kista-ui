# widgets/benchmark-comparison 슬라이스 분리 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `widgets/benchmark-comparison`에 섞여 있던 "비교 축"과 "5분위 원본 축"을 독립 위젯 슬라이스(`widgets/benchmark-comparison` / `widgets/housing-quintile-trend`)로 분리한다.

**Architecture:** 공용 도메인 상수·포매터(`housingBenchmarkChartFormatters`, `DEFAULT_HOUSING_REGION_*`)를 먼저 `entities/stats`로 옮겨 두 위젯의 공통 의존 지점으로 만든다. 그다음 5분위 관련 컴포넌트를 새 위젯으로 옮기고, `HousingBenchmarkComparison`은 quintile 섹션을 직접 렌더링하는 대신 `renderHousingExtras` 콜백 prop을 호출하도록 바꾼다. 두 위젯을 실제로 연결하는 코드는 app 레이어의 신규 client 컴포넌트(`BenchmarkPageContent`)에만 존재해 widget 간 cross-import가 생기지 않는다.

**Tech Stack:** Next.js 16, React, TypeScript, Vitest + Testing Library, recharts

**Spec:** `docs/superpowers/specs/2026-09-25-benchmark-comparison-slice-split-design.md`

## Global Constraints

- 싱글 쿼트, 세미콜론 없음, import 중괄호 공백 유지 — 기존 파일 포맷 일괄 변경 금지
- `any` 금지
- 커밋 메시지는 한글로 작성, 실행 세션의 attribution 안내(Co-Authored-By 등)를 그대로 trailer에 포함
- author 확인: `narafu <narafu@kakao.com>`
- 기본 검증은 `npm run typecheck` — `lint`는 신뢰 불가
- 코드를 변경하는 작업이므로 커밋 직전 리뷰어(`/code-review medium`) 검수 필수, 문서 전용 커밋(Task 6)은 예외
- 전체 테스트 스위트(`npx vitest run`)와 dev 서버 기동 확인은 모든 태스크가 끝난 뒤 Task 7에서 1회만 수행 — 태스크마다 반복하지 않는다

## Review Focus

- **ETF 탭에서 `renderHousingExtras`가 호출되지 않는다** — 자산 탭 분기 로직은 그대로지만 조건부 호출로 형태가 바뀌었다. 실수로 항상 호출하게 만들면 ETF 탭에 5분위 섹션이 새로 나타나는 회귀가 생긴다. → Task 4 테스트로 커버.
- **`renderHousingExtras` prop이 없어도 크래시하지 않는다** — optional 콜백이라 옵셔널 체이닝이 빠지면 프로덕션에서도 죽지 않지만 테스트 없이 놓치기 쉽다. → Task 4에서 prop 없이 렌더하는 기존 다수 테스트가 이미 이 케이스를 커버(별도 신규 테스트 불필요, Task 4에서 확인만).
- **`housingBenchmarkChartFormatters.ts`를 `entities/stats`로 옮기며 자기참조 순환 import를 만들지 않는다** — 파일이 원래 `@entities/stats`에서 타입을 가져오는데, 이 파일 자체가 `entities/stats/index.ts`의 export 대상이 되면 `@entities/stats` import는 자기 자신을 가리키는 순환이 된다. → Task 1에서 상대경로(`../model/types`)로 변경.
- **`getHousingQuintilesByRegionName`의 fallback 지역명이 상수 이동 후에도 동일하게 동작한다** — `DEFAULT_HOUSING_REGION_NAME`을 `entities/stats`로 옮긴 뒤 새 위젯이 이를 import해서 쓰는데, 값이 바뀌거나 import가 깨지면 "알 수 없는 지역명 → 서울로 대체" 동작이 조용히 깨진다. → Task 3에서 이동한 기존 테스트(`HousingBenchmarkRegionQuintileInfo.test.tsx`의 "알 수 없는 지역명" 케이스)가 그대로 통과하는지 확인.
- **`entities/stats/index.ts`의 신규 export가 기존 이름과 충돌하지 않는다** — `DEFAULT_HOUSING_REGION_CODE`/`DEFAULT_HOUSING_REGION_NAME`은 신규 이름이라 충돌 없음(이미 확인됨). → Task 1·2의 typecheck로 재확인.

---

## Task 1: `housingBenchmarkChartFormatters`를 `entities/stats/lib`로 이동

**Files:**
- Create: `entities/stats/lib/housingBenchmarkChartFormatters.ts`
- Create: `entities/stats/lib/housingBenchmarkChartFormatters.test.ts`
- Modify: `entities/stats/index.ts`
- Modify: `widgets/benchmark-comparison/HousingBenchmarkChart.tsx:15`
- Modify: `widgets/benchmark-comparison/EtfPriceChart.tsx:18`
- Modify: `widgets/benchmark-comparison/HousingPriceIndexChart.tsx:19`
- Modify: `widgets/benchmark-comparison/HousingBenchmarkQuintileTrendChart.tsx:19`
- Delete: `widgets/benchmark-comparison/housingBenchmarkChartFormatters.ts`
- Delete: `widgets/benchmark-comparison/housingBenchmarkChartFormatters.test.ts`

**Interfaces:**
- Produces: `entities/stats`가 새로 export하는 함수/타입 — `housingBenchmarkChartNotice`, `formatHousingBenchmarkSeriesLabel`, `formatHousingBenchmarkMonth`, `formatHousingBenchmarkAxisMonth`, `formatHousingBenchmarkDate`, `formatHousingBenchmarkAxisDate`, `formatHousingBenchmarkAxisWeek`, `calculateQuintileCagr`, `calculateSeriesCagr`, `formatCagr`, `formatHousingIndexValue`, `formatHousingBenchmarkTooltipValue`, 타입 `HousingBenchmarkSeriesKey`. 이후 태스크(특히 Task 3)가 이 이름 그대로 `@entities/stats`에서 import한다.

- [ ] **Step 1: 파일 이동 + 자기참조 import 수정**

`git mv`로 파일 두 개를 이동한다:

```bash
git mv widgets/benchmark-comparison/housingBenchmarkChartFormatters.ts entities/stats/lib/housingBenchmarkChartFormatters.ts
git mv widgets/benchmark-comparison/housingBenchmarkChartFormatters.test.ts entities/stats/lib/housingBenchmarkChartFormatters.test.ts
```

`entities/stats/lib/housingBenchmarkChartFormatters.ts` 1번 줄을 수정한다(자기참조 순환 방지 — `entities/finance/lib/aggregate.ts`가 `'../model/types'` 상대경로를 쓰는 것과 동일한 이유):

```ts
import type { HousingBenchmarkPoint, HousingBenchmarkSeriesPoint } from '../model/types'
```

파일 나머지 내용은 무변경.

- [ ] **Step 2: `entities/stats/index.ts`에 export 추가**

파일 끝(`useStatsCyclesQuery,\n} from './hooks/useStatsQueries'` 다음)에 추가:

```ts
export {
  housingBenchmarkChartNotice,
  formatHousingBenchmarkSeriesLabel,
  formatHousingBenchmarkMonth,
  formatHousingBenchmarkAxisMonth,
  formatHousingBenchmarkDate,
  formatHousingBenchmarkAxisDate,
  formatHousingBenchmarkAxisWeek,
  calculateQuintileCagr,
  calculateSeriesCagr,
  formatCagr,
  formatHousingIndexValue,
  formatHousingBenchmarkTooltipValue,
} from './lib/housingBenchmarkChartFormatters'
export type { HousingBenchmarkSeriesKey } from './lib/housingBenchmarkChartFormatters'
```

- [ ] **Step 3: 소비처 3개 파일의 import 경로 변경**

`widgets/benchmark-comparison/HousingBenchmarkChart.tsx` 7~15번 줄:

```ts
import type { HousingBenchmark, HousingBenchmarkPoint } from '@entities/stats'
import {
  formatHousingBenchmarkAxisDate,
  formatHousingBenchmarkAxisWeek,
  formatHousingBenchmarkDate,
  formatHousingBenchmarkSeriesLabel,
  formatHousingBenchmarkTooltipValue,
  housingBenchmarkChartNotice,
  type HousingBenchmarkSeriesKey,
} from '@entities/stats'
```

(두 import를 하나로 합쳐도 되지만, 기존 포맷 변경 최소화를 위해 두 번째 `from` 값만 `'./housingBenchmarkChartFormatters'` → `'@entities/stats'`로 바꾸고 별도 줄로 유지)

`widgets/benchmark-comparison/EtfPriceChart.tsx` 13~18번 줄, `from './housingBenchmarkChartFormatters'` → `from '@entities/stats'`로 변경(나머지 동일).

`widgets/benchmark-comparison/HousingPriceIndexChart.tsx` 13~19번 줄, 동일하게 `from './housingBenchmarkChartFormatters'` → `from '@entities/stats'`.

`widgets/benchmark-comparison/HousingBenchmarkQuintileTrendChart.tsx` 14~19번 줄, 동일하게 `from './housingBenchmarkChartFormatters'` → `from '@entities/stats'`.

- [ ] **Step 4: 타입 검사 + 이동한 테스트 실행**

```bash
npm run typecheck
npx vitest run entities/stats/lib/housingBenchmarkChartFormatters.test.ts widgets/benchmark-comparison/HousingBenchmarkChart.test.tsx widgets/benchmark-comparison/HousingBenchmarkQuintileTrendChart.test.tsx
```

Expected: 타입 오류 없음, 모든 테스트 PASS. (`HousingBenchmarkChart.tsx`는 자체 테스트 파일이 없다면 이 커맨드에서 해당 인자만 빼고 실행)

- [ ] **Step 5: Commit**

```bash
git add entities/stats/lib/housingBenchmarkChartFormatters.ts entities/stats/lib/housingBenchmarkChartFormatters.test.ts entities/stats/index.ts widgets/benchmark-comparison/HousingBenchmarkChart.tsx widgets/benchmark-comparison/EtfPriceChart.tsx widgets/benchmark-comparison/HousingPriceIndexChart.tsx widgets/benchmark-comparison/HousingBenchmarkQuintileTrendChart.tsx
git commit -m "refactor(stats): housingBenchmarkChartFormatters를 entities/stats/lib로 이동

비교 축·5분위 축 양쪽이 공유하는 순수 함수라 widget 레벨에 두면
분리 예정인 두 위젯 모두 cross-import가 필요해진다."
```

---

## Task 2: 지역 기본값 상수를 `entities/stats/lib`로 이동

**Files:**
- Create: `entities/stats/lib/housingRegionDefaults.ts`
- Modify: `entities/stats/index.ts`
- Modify: `widgets/benchmark-comparison/housingBenchmarkContent.ts`
- Modify: `widgets/benchmark-comparison/model/useBenchmarkFilters.ts:5,44`
- Modify: `widgets/benchmark-comparison/HousingBenchmarkComparison.tsx:21-24,52,54,56`

**Interfaces:**
- Consumes: 없음 (순수 상수 이동)
- Produces: `DEFAULT_HOUSING_REGION_CODE: string`, `DEFAULT_HOUSING_REGION_NAME: string` — `@entities/stats`에서 export. Task 3이 `DEFAULT_HOUSING_REGION_NAME`을 그대로 import한다.

- [ ] **Step 1: 신규 파일 작성**

`entities/stats/lib/housingRegionDefaults.ts`:

```ts
// 서버 기본값(GET /housing-benchmark, /housing-benchmark/series의 regionCode 기본값)과 동일
export const DEFAULT_HOUSING_REGION_CODE = '1100000000'
export const DEFAULT_HOUSING_REGION_NAME = '서울'
```

- [ ] **Step 2: `entities/stats/index.ts`에 export 추가**

Task 1에서 추가한 블록 다음에 추가:

```ts
export { DEFAULT_HOUSING_REGION_CODE, DEFAULT_HOUSING_REGION_NAME } from './lib/housingRegionDefaults'
```

- [ ] **Step 3: `housingBenchmarkContent.ts`에서 두 상수 제거**

`widgets/benchmark-comparison/housingBenchmarkContent.ts`에서 다음 두 줄을 삭제한다(51~57번 줄 부근):

```ts
// "가격 추이" 비교지역 선택과 연동되는 지역별 5분위 안내 — 전국/수도권은 서울 설명 패턴(대표 지역·특징)에 맞춰 편집
export type HousingRegionName = '전국' | '서울' | '수도권'

export const DEFAULT_HOUSING_REGION_NAME: HousingRegionName = '서울'

// 서버 기본값(GET /housing-benchmark, /housing-benchmark/series의 regionCode 기본값)과 동일
export const DEFAULT_HOUSING_REGION_CODE = '1100000000'
```

(`HousingRegionName` 타입과 `DEFAULT_HOUSING_REGION_NAME` 상수는 이 시점엔 그대로 두되, 값은 `'서울'` 리터럴 대신 import해서 재사용하도록 다음 줄로 교체 — Task 3에서 quintile 콘텐츠 전체가 이 파일에서 빠져나갈 때까지 과도기적으로 필요):

```ts
import { DEFAULT_HOUSING_REGION_NAME } from '@entities/stats'

export type HousingRegionName = '전국' | '서울' | '수도권'
export { DEFAULT_HOUSING_REGION_NAME }
```

파일 상단 기존 `import type { EtfBenchmarkSymbol } from '@entities/stats'` 줄과 합쳐 하나의 import로 정리한다(이 re-export는 Task 3에서 quintile 콘텐츠 전체가 새 위젯으로 빠져나가면 함께 삭제되는 과도기적 코드):

```ts
import { type EtfBenchmarkSymbol, DEFAULT_HOUSING_REGION_NAME } from '@entities/stats'

export type HousingRegionName = '전국' | '서울' | '수도권'
export { DEFAULT_HOUSING_REGION_NAME }
```

- [ ] **Step 4: 소비처 import 경로 변경**

`widgets/benchmark-comparison/model/useBenchmarkFilters.ts` 5번 줄:

```ts
import { DEFAULT_HOUSING_REGION_CODE } from '@entities/stats'
```

`widgets/benchmark-comparison/HousingBenchmarkComparison.tsx` 21~24번 줄(현재 `DEFAULT_HOUSING_REGION_NAME`과 `getEtfBenchmarkContent`를 `./housingBenchmarkContent`에서 함께 import):

```ts
import { DEFAULT_HOUSING_REGION_NAME } from '@entities/stats'
import { getEtfBenchmarkContent } from './housingBenchmarkContent'
```

52·54·56번 줄의 `DEFAULT_HOUSING_REGION_NAME` 사용은 그대로 둔다(값·타입 동일, import 출처만 바뀜).

- [ ] **Step 5: 타입 검사 + 관련 테스트 실행**

```bash
npm run typecheck
npx vitest run widgets/benchmark-comparison/HousingBenchmarkComparison.test.tsx widgets/benchmark-comparison/BenchmarkFilterBar.test.tsx
```

Expected: 타입 오류 없음, 모든 테스트 PASS(이 태스크는 값 변경이 없는 이동이라 기존 테스트 무수정으로 통과해야 한다).

- [ ] **Step 6: Commit**

```bash
git add entities/stats/lib/housingRegionDefaults.ts entities/stats/index.ts widgets/benchmark-comparison/housingBenchmarkContent.ts widgets/benchmark-comparison/model/useBenchmarkFilters.ts widgets/benchmark-comparison/HousingBenchmarkComparison.tsx
git commit -m "refactor(stats): 아파트 벤치마크 지역 기본값 상수를 entities/stats로 이동

DEFAULT_HOUSING_REGION_CODE/NAME은 서버 기본값과 동일한 도메인 상수라
widget보다 entities가 맞는 위치. 분리 예정인 quintile 위젯도
이 상수를 참조해야 해서 미리 옮겨 둔다."
```

---

## Task 3: 신규 슬라이스 `widgets/housing-quintile-trend/` 생성

**Files:**
- Create: `widgets/housing-quintile-trend/housingQuintileContent.ts`
- Create: `widgets/housing-quintile-trend/HousingBenchmarkQuintileTrendChart.tsx` (이동)
- Create: `widgets/housing-quintile-trend/HousingBenchmarkQuintileTrendChart.test.tsx` (이동)
- Create: `widgets/housing-quintile-trend/HousingBenchmarkRegionQuintileInfo.tsx` (이동)
- Create: `widgets/housing-quintile-trend/HousingBenchmarkRegionQuintileInfo.test.tsx` (이동)
- Create: `widgets/housing-quintile-trend/HousingQuintileTrend.tsx`
- Create: `widgets/housing-quintile-trend/HousingQuintileTrend.test.tsx`
- Create: `widgets/housing-quintile-trend/index.ts`
- Modify: `widgets/benchmark-comparison/housingBenchmarkContent.ts`

**Interfaces:**
- Consumes: `DEFAULT_HOUSING_REGION_NAME` from `@entities/stats` (Task 2), `housingBenchmarkChartNotice` 등 `@entities/stats`의 포매터(Task 1) — `HousingBenchmarkQuintileTrendChart.tsx`는 이미 이 경로를 쓰도록 Task 1에서 바뀌어 있다.
- Produces: `HousingQuintileTrend(props: { enabled: boolean; from?: string; to?: string }): ReactNode` — Task 5(`BenchmarkPageContent`)가 이 시그니처로 import한다.

- [ ] **Step 1: quintile 콘텐츠를 새 파일로 이동**

`widgets/benchmark-comparison/housingBenchmarkContent.ts`에서 `HousingQuintile` 타입부터 `getHousingQuintilesByRegionName` 함수까지(`HOUSING_QUINTILES`, `HousingQuintileContent`, `HousingRegionName`, `NATIONWIDE_QUINTILES`, `CAPITAL_AREA_QUINTILES`, `HOUSING_QUINTILES_BY_REGION`, `getHousingQuintilesByRegionName`, 그리고 Task 2에서 re-export하도록 만든 `DEFAULT_HOUSING_REGION_NAME` 블록) 전체를 잘라내 `widgets/housing-quintile-trend/housingQuintileContent.ts`에 붙여넣는다. 새 파일 상단 import는 다음으로 교체:

```ts
import { DEFAULT_HOUSING_REGION_NAME } from '@entities/stats'
```

기존 파일 안에서 `DEFAULT_HOUSING_REGION_NAME`을 참조하던 `getHousingQuintilesByRegionName`의 fallback 줄은 그대로 유지된다(값·동작 무변경, import 출처만 새 파일에서 직접 가져오도록 바뀜):

```ts
export function getHousingQuintilesByRegionName(regionName: string): HousingQuintileContent[] {
  return HOUSING_QUINTILES_BY_REGION[regionName as HousingRegionName] ?? HOUSING_QUINTILES_BY_REGION[DEFAULT_HOUSING_REGION_NAME]
}
```

`widgets/benchmark-comparison/housingBenchmarkContent.ts`에는 ETF 콘텐츠(`ETF_BENCHMARK_CURRENCY_NOTICE_FALLBACK`, `BenchmarkRiskTier`, `EtfBenchmarkContent`, `ETF_BENCHMARKS`, `getEtfBenchmarkContent`)만 남고, 상단 import는 원래대로 `import type { EtfBenchmarkSymbol } from '@entities/stats'` 하나만 남는다(Task 2에서 추가했던 `DEFAULT_HOUSING_REGION_NAME` re-export 관련 줄 전부 삭제).

- [ ] **Step 2: 컴포넌트 두 개 이동**

```bash
git mv widgets/benchmark-comparison/HousingBenchmarkQuintileTrendChart.tsx widgets/housing-quintile-trend/HousingBenchmarkQuintileTrendChart.tsx
git mv widgets/benchmark-comparison/HousingBenchmarkQuintileTrendChart.test.tsx widgets/housing-quintile-trend/HousingBenchmarkQuintileTrendChart.test.tsx
git mv widgets/benchmark-comparison/HousingBenchmarkRegionQuintileInfo.tsx widgets/housing-quintile-trend/HousingBenchmarkRegionQuintileInfo.tsx
git mv widgets/benchmark-comparison/HousingBenchmarkRegionQuintileInfo.test.tsx widgets/housing-quintile-trend/HousingBenchmarkRegionQuintileInfo.test.tsx
```

`HousingBenchmarkQuintileTrendChart.tsx`는 이미 Task 1에서 formatter import가 `@entities/stats`로 바뀌어 있어 내용 수정 불필요.

`HousingBenchmarkRegionQuintileInfo.tsx`의 1번 줄만 수정:

```ts
import { getHousingQuintilesByRegionName } from './housingQuintileContent'
```

테스트 파일 두 개는 전부 상대 import(`./HousingBenchmarkQuintileTrendChart`, `./HousingBenchmarkRegionQuintileInfo`)와 `@entities/stats` alias만 써서 내용 수정 없이 그대로 이동.

- [ ] **Step 3: 컨테이너 `HousingQuintileTrend.tsx` 작성**

```tsx
'use client'

import { useCallback, useState } from 'react'
import type { HousingBenchmarkRegion } from '@entities/stats'
import { DEFAULT_HOUSING_REGION_NAME } from '@entities/stats'
import { HousingBenchmarkQuintileTrendChart } from './HousingBenchmarkQuintileTrendChart'
import { HousingBenchmarkRegionQuintileInfo } from './HousingBenchmarkRegionQuintileInfo'

interface Props {
  enabled: boolean
  from?: string
  to?: string
}

// 5분위 원본 시세 차트에서 선택한 지역이 바로 아래 지역 안내 섹션에도 반영되도록
// 두 컴포넌트를 하나의 단위로 묶는다 — HousingBenchmarkComparison이 알던 상태를 그대로 옮겨온 것.
export function HousingQuintileTrend({ enabled, from, to }: Props) {
  const [regionName, setRegionName] = useState<string>(DEFAULT_HOUSING_REGION_NAME)
  const handleRegionChange = useCallback(
    (region: HousingBenchmarkRegion) => setRegionName(region.name ?? DEFAULT_HOUSING_REGION_NAME),
    [],
  )

  return (
    <div className="flex flex-col gap-4">
      <HousingBenchmarkQuintileTrendChart enabled={enabled} from={from} to={to} onRegionChange={handleRegionChange} />
      <HousingBenchmarkRegionQuintileInfo regionName={regionName} />
    </div>
  )
}
```

- [ ] **Step 4: `index.ts` 작성**

```ts
export { HousingQuintileTrend } from './HousingQuintileTrend'
```

- [ ] **Step 5: 실패하는 테스트 작성**

`widgets/housing-quintile-trend/HousingQuintileTrend.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { HousingBenchmarkRegionsList, HousingBenchmarkSeries } from '@entities/stats'
import { HousingQuintileTrend } from './HousingQuintileTrend'

const { useHousingBenchmarkSeriesQueryMock, useHousingBenchmarkRegionsQueryMock } = vi.hoisted(() => ({
  useHousingBenchmarkSeriesQueryMock: vi.fn(),
  useHousingBenchmarkRegionsQueryMock: vi.fn(),
}))

vi.mock('@entities/stats', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@entities/stats')>()
  return {
    ...actual,
    useHousingBenchmarkSeriesQuery: useHousingBenchmarkSeriesQueryMock,
    useHousingBenchmarkRegionsQuery: useHousingBenchmarkRegionsQueryMock,
  }
})

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
}))

const SERIES: HousingBenchmarkSeries = { points: [], sourceUpdatedDate: null }
const REGIONS: HousingBenchmarkRegionsList = {
  regions: [
    { code: '1100000000', name: '서울' },
    { code: '4100000000', name: '수도권' },
  ],
}

describe('HousingQuintileTrend', () => {
  it('차트에서 지역을 변경하면 아래 안내 섹션의 지역명도 함께 바뀐다', async () => {
    const user = userEvent.setup()
    useHousingBenchmarkSeriesQueryMock.mockReturnValue({ data: SERIES, isLoading: false, isError: false })
    useHousingBenchmarkRegionsQueryMock.mockReturnValue({ data: REGIONS, isLoading: false, isError: false })

    render(<HousingQuintileTrend enabled />)

    expect(screen.getByText('서울 아파트 5분위 안내')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('비교 지역'), '4100000000')

    expect(screen.getByText('수도권 아파트 5분위 안내')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: 테스트 실행 (전체)**

```bash
npm run typecheck
npx vitest run widgets/housing-quintile-trend
```

Expected: 이동한 두 테스트 파일 + 신규 `HousingQuintileTrend.test.tsx` 전부 PASS.

- [ ] **Step 7: Commit**

```bash
git add widgets/housing-quintile-trend widgets/benchmark-comparison/housingBenchmarkContent.ts
git commit -m "refactor(widgets): 5분위 원본 축을 widgets/housing-quintile-trend로 분리

HousingBenchmarkQuintileTrendChart·HousingBenchmarkRegionQuintileInfo와
둘 사이 지역 선택 상태(구 HousingBenchmarkComparison 소유)를 신규
위젯으로 옮긴다. 컨테이너 wiring 테스트 신규 추가."
```

---

## Task 4: `HousingBenchmarkComparison`을 `renderHousingExtras` 콜백 방식으로 전환

**Files:**
- Modify: `widgets/benchmark-comparison/HousingBenchmarkComparison.tsx`
- Modify: `widgets/benchmark-comparison/HousingBenchmarkComparison.test.tsx`

**Interfaces:**
- Produces: `HousingBenchmarkComparison`의 새 prop `renderHousingExtras?: (range: { from?: string; to: string }) => ReactNode`. Task 5(`BenchmarkPageContent`)가 이 시그니처로 값을 전달한다.

- [ ] **Step 1: import·state 정리**

`widgets/benchmark-comparison/HousingBenchmarkComparison.tsx` 1~24번 줄을 다음으로 교체(quintile 관련 import 제거, `ReactNode` 타입 추가, `DEFAULT_HOUSING_REGION_NAME`은 Task 2에서 `@entities/stats`로 옮겼으므로 그쪽에서 import):

```tsx
'use client'

import { useEffect, useMemo, type ReactNode } from 'react'
import { useHousingBenchmarkQuery, useHousingBenchmarkRegionsQuery } from '@entities/stats'
import type { HousingBenchmark } from '@entities/stats'
import { DEFAULT_HOUSING_REGION_NAME } from '@entities/stats'
import { DEFAULT_RUNTIME_BENCHMARKS, useRuntimeConfigQuery } from '@entities/runtime-config'
import { EmptyState } from '@shared/ui/EmptyState'
import { SectionError } from '@shared/ui/SectionError'
import { BenchmarkFilterBar } from './BenchmarkFilterBar'
import { BenchmarkLoading } from './BenchmarkStates'
import { EtfPriceChart } from './EtfPriceChart'
import { HousingBenchmarkChart } from './HousingBenchmarkChart'
import { HousingBenchmarkSummary } from './HousingBenchmarkSummary'
import { HousingBenchmarkInfo } from './HousingBenchmarkInfo'
import { HousingPriceIndexChart } from './HousingPriceIndexChart'
import { emptyMessage, uniqueSymbols } from './model/benchmarkPeriods'
import { useBenchmarkFilters } from './model/useBenchmarkFilters'
import { useBenchmarkStrategyOptions } from './model/useBenchmarkStrategyOptions'
import { getEtfBenchmarkContent } from './housingBenchmarkContent'

interface Props {
  enabled: boolean
  defaultTo: string
  renderHousingExtras?: (range: { from?: string; to: string }) => ReactNode
}
```

`useCallback`·`useState`는 이 컴포넌트에서 `trendRegionName`/`handleTrendRegionChange`(삭제 대상) 용도로만 쓰였으므로 react import에서 함께 뺀다(다른 용도로 쓰이는 곳이 없는지 삭제 전에 파일 전체에서 `useState(`/`useCallback(` 검색으로 재확인). `HousingBenchmarkRegion` 타입 import(기존 5번 줄)도 같은 이유로 삭제한다.

함수 본문에서 `HousingBenchmarkComparison`의 시그니처를 `{ enabled, defaultTo, renderHousingExtras }`로 바꾸고, 기존 54~58번 줄(`trendRegionName` state + `handleTrendRegionChange`)을 통째로 삭제한다.

- [ ] **Step 2: 렌더 블록 교체**

기존 191~197번 줄(quintile 섹션)을:

```tsx
      {/* 아파트 탭에서만 표시 — 사용자 투자 데이터와 무관하게 항상 나오는 5분위 원본 시계열, 위 비교 결과와 독립적, 상단 "비교 기간" 토글과 동일한 from/to 사용 */}
      {activeAsset === 'HOUSING' ? (
        <div className="flex flex-col gap-4">
          <HousingBenchmarkQuintileTrendChart enabled={enabled} from={from} to={to} onRegionChange={handleTrendRegionChange} />
          <HousingBenchmarkRegionQuintileInfo regionName={trendRegionName} />
        </div>
      ) : null}
```

다음으로 교체:

```tsx
      {/* 아파트 탭에서만 표시 — 5분위 원본 시계열은 widgets/housing-quintile-trend가 담당,
          이 위젯은 그 존재를 모르고 콜백만 호출한다(app 레이어 BenchmarkPageContent가 연결) */}
      {activeAsset === 'HOUSING' ? renderHousingExtras?.({ from, to }) : null}
```

- [ ] **Step 3: 테스트 파일 수정 — quintile mock 제거**

`widgets/benchmark-comparison/HousingBenchmarkComparison.test.tsx` 52~54번 줄(`vi.mock('./HousingBenchmarkQuintileTrendChart', ...)`)을 통째로 삭제한다.

- [ ] **Step 4: 테스트 파일 수정 — line 410 근처 assertion 교체**

385~411번 줄의 테스트를 다음으로 교체(다른 assertion은 무변경, 마지막 두 줄만 변경):

```tsx
  it("전략 드롭다운에서 '없음'을 선택하면 비교 대신 선택 지역의 매매가격지수만 표시한다", async () => {
    const user = userEvent.setup()
    useHousingPriceIndexSeriesQueryMock.mockReturnValue({
      data: {
        points: [
          { baseDate: '2026-01-05', indexValue: 100.5 },
          { baseDate: '2026-07-06', indexValue: 108.2 },
        ],
        sourceUpdatedDate: '2026-07-06',
      },
      isLoading: false,
      isError: false,
    })
    const renderHousingExtras = vi.fn(() => <div data-testid="housing-extras-stub" />)
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" renderHousingExtras={renderHousingExtras} />)
    await user.click(screen.getByRole('button', { name: '아파트' }))

    await user.selectOptions(screen.getByLabelText('전략'), 'NONE')

    expect(useHousingPriceIndexSeriesQueryMock).toHaveBeenLastCalledWith(
      { from: '2025-07-17', to: '2026-07-17', regionCode: '1100000000' }, true,
    )
    expect(screen.getByText('서울 아파트 매매가격지수')).toBeInTheDocument()
    expect(screen.getByText('매매가격지수: indexValue')).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: '장기 성과 지표 비교' })).not.toBeInTheDocument()
    // 아파트 5분위 원본 시세 섹션(renderHousingExtras)은 '없음' 선택과 무관하게 항상 호출된다
    expect(screen.getByTestId('housing-extras-stub')).toBeInTheDocument()
  })
```

- [ ] **Step 5: 실패하는 테스트 작성 — ETF 탭에서는 콜백이 호출되지 않는다**

이 파일의 describe 블록 안, 위에서 수정한 테스트 근처에 새 테스트를 추가한다:

```tsx
  it('ETF 탭(기본 탭)에서는 renderHousingExtras를 호출하지 않는다', () => {
    const renderHousingExtras = vi.fn(() => <div data-testid="housing-extras-stub" />)
    render(<HousingBenchmarkComparison enabled defaultTo="2026-07-17" renderHousingExtras={renderHousingExtras} />)

    expect(renderHousingExtras).not.toHaveBeenCalled()
    expect(screen.queryByTestId('housing-extras-stub')).not.toBeInTheDocument()
  })
```

- [ ] **Step 6: 테스트 실행**

```bash
npm run typecheck
npx vitest run widgets/benchmark-comparison/HousingBenchmarkComparison.test.tsx
```

Expected: 신규 테스트 포함 전부 PASS. (typecheck 단계에서 Step 1의 import 정리 실수 — 예: `DEFAULT_HOUSING_REGION_NAME` 출처를 잘못 합친 경우 — 가 있으면 여기서 드러난다)

- [ ] **Step 7: Commit**

```bash
git add widgets/benchmark-comparison/HousingBenchmarkComparison.tsx widgets/benchmark-comparison/HousingBenchmarkComparison.test.tsx
git commit -m "refactor(widgets): HousingBenchmarkComparison이 renderHousingExtras 콜백으로 5분위 섹션을 위임

quintile 컴포넌트를 직접 import하지 않고 콜백 prop만 호출하도록 바꿔
widget 간 cross-import 없이 app 레이어에서 두 위젯을 연결할 수 있게 한다."
```

---

## Task 5: app 레이어 `BenchmarkPageContent` 작성 및 페이지 연결

**Files:**
- Create: `app/(main)/stats/benchmark/BenchmarkPageContent.tsx`
- Modify: `app/(main)/stats/benchmark/page.tsx`

**Interfaces:**
- Consumes: `HousingBenchmarkComparison` (Task 4의 `renderHousingExtras` prop), `HousingQuintileTrend` (Task 3)

- [ ] **Step 1: `BenchmarkPageContent.tsx` 작성**

```tsx
'use client'

import { HousingBenchmarkComparison } from '@widgets/benchmark-comparison'
import { HousingQuintileTrend } from '@widgets/housing-quintile-trend'

interface Props {
  enabled: boolean
  defaultTo: string
}

// 두 위젯(비교 축·5분위 원본 축)을 실제로 아는 유일한 곳 — widget끼리는 서로 모른다.
// Server Component인 page.tsx가 함수를 prop으로 넘길 수 없어 이 client 컴포넌트가 필요하다.
export function BenchmarkPageContent({ enabled, defaultTo }: Props) {
  return (
    <HousingBenchmarkComparison
      enabled={enabled}
      defaultTo={defaultTo}
      renderHousingExtras={({ from, to }) => (
        <HousingQuintileTrend enabled={enabled} from={from} to={to} />
      )}
    />
  )
}
```

- [ ] **Step 2: `page.tsx` 수정**

`app/(main)/stats/benchmark/page.tsx` 3번 줄과 27번 줄:

```ts
import { BenchmarkPageContent } from './BenchmarkPageContent'
```

```tsx
      <BenchmarkPageContent enabled defaultTo={todayKst()} />
```

- [ ] **Step 3: 타입 검사**

```bash
npm run typecheck
```

Expected: 오류 없음. (이 태스크는 새 조합 코드라 전용 유닛 테스트는 없음 — Task 7의 Playwright 확인이 실제 동작 검증을 담당)

- [ ] **Step 4: Commit**

```bash
git add "app/(main)/stats/benchmark/BenchmarkPageContent.tsx" "app/(main)/stats/benchmark/page.tsx"
git commit -m "feat(app): 벤치마크 페이지에서 두 위젯을 BenchmarkPageContent로 합성

widgets/benchmark-comparison과 widgets/housing-quintile-trend는
서로를 모르고, app 레이어의 이 컴포넌트만 render-prop으로 연결한다."
```

---

## Task 6: 문서 갱신

**Files:**
- Modify: `docs/agents/widgets.md`

- [ ] **Step 1: `benchmark-comparison` 항목 갱신 + `housing-quintile-trend` 항목 신설**

`docs/agents/widgets.md`의 `**\`benchmark-comparison\`**:` 항목에서 5분위 관련 서술("5분위(quintile) 원본 섹션 — 별도 이원 구조" 소단락 전체)을 제거하고, 남은 서술이 비교 축 전용임을 명확히 한다. 같은 항목 안에 있던 "규모 비교 축(investment vs. benchmark)" 소단락은 유지하되, `HousingBenchmarkComparison`이 이제 `renderHousingExtras` prop으로 5분위 섹션을 위임한다는 문장을 추가한다.

새 항목을 그 아래 추가한다:

```markdown
- **`housing-quintile-trend`**: `benchmark-comparison`의 HOUSING 탭에서만 쓰이는 5분위(quintile) 원본 시계열 섹션 — 사용자 투자 데이터와 무관하게 항상 렌더링된다(투자-벤치마크 비교 축과 독립). `HousingQuintileTrend`가 진입점이며 지역 선택 상태(차트에서 고른 지역 → 아래 안내 패널에 반영)를 내부에 캡슐화한다. `benchmark-comparison`은 이 위젯의 존재를 모른다 — `app/(main)/stats/benchmark/BenchmarkPageContent.tsx`가 `renderHousingExtras` render-prop으로 둘을 연결한다(아래 "화이트리스트 밖 조합" 패턴의 콜백 변형).
```

"화이트리스트 밖 조합이 필요했던 사례" 단락 끝에 문장을 추가한다:

```markdown
자식이 부모 내부 상태(데이터)를 필요로 해서 순수 `ReactNode` slot으로는 부족한 경우, `ReactNode`를 반환하는 콜백 prop(예: `renderHousingExtras`)을 slot으로 쓰는 변형도 같은 원칙의 연장이다 — `benchmark-comparison`/`housing-quintile-trend`(`app/(main)/stats/benchmark/BenchmarkPageContent.tsx`) 참고.
```

- [ ] **Step 2: Commit**

문서 전용 변경이라 리뷰어 검수 없이 커밋(constraints.md 예외 규정).

```bash
git add docs/agents/widgets.md
git commit -m "docs(widgets): benchmark-comparison/housing-quintile-trend 슬라이스 분리 반영

widgets.md가 문서화하던 목적축 혼재 문제를 실제 분리로 해소한 결과를
기록. render-prop 변형 패턴도 화이트리스트 밖 조합 선례로 추가."
```

---

## Task 7: 최종 검증

**Files:** 없음 (검증 전용)

- [ ] **Step 1: 타입 검사 + 변경된 테스트 전체 재실행**

```bash
npm run typecheck
npx vitest run entities/stats widgets/benchmark-comparison widgets/housing-quintile-trend
```

Expected: 오류 없음, 전부 PASS.

- [ ] **Step 2: 전체 테스트 스위트 1회**

```bash
npx vitest run
```

Expected: 기존에 실패하던 테스트가 없었다면 전부 PASS(무관한 기존 실패가 있었다면 이 브랜치가 원인이 아님을 diff로 확인).

- [ ] **Step 3: 실제 렌더링 확인**

dev 서버 기동:

```bash
npm run dev
cat /tmp/kista_dev.log | grep "Local:"
```

Playwright로 `/stats/benchmark` 방문 후: ETF 탭(기본)에서 5분위 섹션이 보이지 않는지, "아파트" 탭 클릭 시 5분위 섹션이 나타나는지, 5분위 차트의 "비교 지역" select를 바꾸면 아래 안내 패널의 제목("OO 아파트 5분위 안내")이 바뀌는지 스크린샷으로 확인.

```bash
npx playwright screenshot --browser chromium --viewport-size "1440,900" http://localhost:3000/stats/benchmark /tmp/benchmark-etf.png
```

- [ ] **Step 4: 커밋 전 리뷰어 검수**

Task 1·2·3·4·5의 diff(문서 커밋인 Task 6 제외)를 대상으로 `/code-review medium` 실행. 발견된 실제 결함은 수정 후 재검증(해당 태스크의 테스트 재실행)하고 별도 커밋으로 반영.

- [ ] **Step 5: 완료 보고**

리뷰 통과 확인 후 사용자에게 결과 요약 보고(변경 파일 목록, 테스트 결과, Playwright 확인 결과).
