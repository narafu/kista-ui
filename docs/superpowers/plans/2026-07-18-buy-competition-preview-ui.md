# 바로주문 미리보기 예수금 경쟁 정보 UI 연동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** kista-api `NextOrdersResponse.competition` 필드(BUY 예산 경쟁 시뮬레이션 결과)를 kista-ui 전략 상세 페이지의 "다음 주문" 카드에 반영해, 기존 클라이언트 계산 방식의 "예수금 부족" 배지를 서버의 우선순위 경쟁 반영 판정으로 교체한다.

**Architecture:** `openapi.json`/`api-types.ts`를 로컬 kista-api 서버 기준으로 재생성(별도 커밋으로 분리) → `entities/order` 도메인 타입에 `BuyCompetitionSummary`/`CompetingStrategy` 추가 + `normalizePreview()` 파싱 로직 확장 → 신규 `BuyCompetitionNotice` 컴포넌트(배지 + 부족액 + 확장 가능한 경쟁 전략 목록) → `StrategyDetail.tsx`의 기존 `useAccountMarginQuery` 기반 부족액 계산을 서버 `competition` 값 소비로 교체.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, React Query, Vitest + @testing-library/react.

## Global Constraints

- 설계 스펙: `docs/superpowers/specs/2026-07-18-buy-competition-preview-ui-design.md` (승인 완료) — 세부 규칙 SSOT.
- 범위: 전략 상세 페이지(`widgets/strategy-detail/StrategyDetail.tsx`)만. 전략 목록/대시보드(`StrategyCard.tsx`)는 범위 밖.
- `openapi.json`이 SSOT — `api-types.ts` 직접 수정 금지, 반드시 `npm run fetch:spec && npm run gen:types`로 재생성.
- `CompetingStrategy.type`/`.ticker` 필드는 `entities/order` 모듈의 기존 관례(`NextOrderItem.ticker/direction`이 loose `string`)를 따라 `string`으로 정의 — 표시 전용이라 정밀 enum 불필요. 반면 조건 분기에 쓰이는 `skipReason` 같은 필드만 `api-schema.ts`의 정밀 타입을 재사용하는 게 이 프로젝트의 기존 구분 기준.
- 싱글 쿼트, 세미콜론 없음, import 중괄호 공백 유지, 인라인 `style` 금지(CSS 토큰/픽셀 계산 예외).
- `any` 금지 — 제네릭·`?.`·`??`로 대체.
- 서버 상태를 `useState`에 복사하지 않음 — React Query가 SSOT.
- 기본 검증: `npm run typecheck`. `npm run test:run`으로 Vitest 1회 실행.
- 커밋 메시지 한글, author `narafu <narafu@kakao.com>`. 괄호 포함 경로는 `git add "path(with)paren.tsx"`처럼 큰따옴표.
- 각 태스크 종료 시 `npm run typecheck` + 관련 테스트 실행으로 검증.

---

### Task 1: OpenAPI 타입 동기화

**Files:**
- Modify: `openapi.json` (재생성)
- Modify: `shared/lib/api-types.ts` (재생성)

**Interfaces:**
- Produces: `components["schemas"]["BuyCompetitionSummary"]`, `components["schemas"]["CompetingStrategy"]`, `components["schemas"]["NextOrdersResponse"]["competition"]` — Task 2가 이 생성된 타입 존재를 전제로 도메인 타입을 손으로 작성(직접 참조하지는 않음, 존재 여부만 검증에 사용).

**주의:** 로컬 kista-api 서버가 이미 병합된 `competition` 필드를 포함해 실행 중이어야 한다(`curl -s http://localhost:8080/api-docs`로 확인, 응답 없으면 kista-api 저장소에서 `./gradlew bootRun --args='--spring.profiles.active=local'`로 기동). 이 재생성은 이번 기능과 무관한 기존 API drift(관리자 설정 재구조화·통계 엔드포인트 등, 약 1200줄 이상)도 함께 반영한다 — 의도된 것이며 별도 커밋으로 분리해 이후 기능 커밋과 섞이지 않게 한다.

- [ ] **Step 1: 로컬 kista-api 서버 응답 확인**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api-docs --max-time 3`
Expected: `200`. 아니면 kista-api를 먼저 기동한 뒤 재시도.

- [ ] **Step 2: competition 필드 반영 여부 확인**

Run: `curl -s http://localhost:8080/api-docs | grep -o '"competition"\|"BuyCompetitionSummary"\|"CompetingStrategy"' | sort -u`
Expected: 세 문자열 모두 출력됨. 하나라도 없으면 kista-api가 최신 main이 아님 — 중단하고 확인.

- [ ] **Step 3: 스펙 재생성**

```bash
npm run fetch:spec
npm run gen:types
```
Expected: `openapi-typescript` 성공 로그, 오류 없음.

- [ ] **Step 4: 생성 결과 검증**

Run: `grep -n "BuyCompetitionSummary\|CompetingStrategy" shared/lib/api-types.ts`
Expected: `BuyCompetitionSummary: {`, `CompetingStrategy: {` 블록이 출력되고, `NextOrdersResponse` 블록 안에 `competition?: components["schemas"]["BuyCompetitionSummary"];` 라인이 존재.

- [ ] **Step 5: 타입 검사**

Run: `npm run typecheck`
Expected: 기존 코드 전체가 재생성된 타입과 여전히 호환(에러 없음) — 이 시점에는 아직 `competition` 필드를 소비하는 코드가 없으므로 새 타입 관련 에러는 없어야 함.

- [ ] **Step 6: 커밋**

```bash
git add openapi.json shared/lib/api-types.ts
git commit -m "$(cat <<'EOF'
chore: openapi 스펙 동기화 (kista-api competition 필드 포함)

npm run fetch:spec && npm run gen:types 실행 — BuyCompetitionSummary/
CompetingStrategy 스키마 및 그간 밀린 API drift(관리자 설정·통계
엔드포인트 등) 일괄 반영. 이후 커밋은 competition 관련 코드만 다룸
EOF
)"
```

---

### Task 2: `entities/order` 도메인 타입 확장 + `normalizePreview()` 파싱

**Files:**
- Modify: `entities/order/model/types.ts`
- Modify: `entities/order/api/index.ts`
- Modify: `entities/order/index.ts`
- Create: `entities/order/api/index.test.ts` (신규 — 기존에 이 파일에 대한 테스트가 없으면 새로 만듦, 있으면 테스트만 추가)

**Interfaces:**
- Produces: `CompetingStrategy { strategyId: string; type: string; ticker: string; requiredBuyUsd: string; priority: number }`, `BuyCompetitionSummary { sufficientBudget: boolean; availableDeposit: string; requiredForThisStrategy: string; consumedByHigherPriority: string; blockedByHigherPriority: CompetingStrategy[]; uncertainStrategyIds: string[] }`, `NextOrderPreview.competition: BuyCompetitionSummary | null` — Task 3·4가 이 타입들을 `@entities/order`에서 import해 사용.

- [ ] **Step 1: 기존 `entities/order/api/index.test.ts` 존재 여부 확인**

Run: `test -f entities/order/api/index.test.ts && echo EXISTS || echo MISSING`

- [ ] **Step 2: 실패하는 테스트 작성**

`entities/order/api/index.test.ts`에 아래 테스트를 추가(파일이 이미 있으면 기존 내용 유지하고 이 테스트만 추가, 없으면 아래 전체로 신규 생성 — `getStrategyOrdersPreview`는 `clientFetch`를 호출하므로 `@shared/lib/api-client`를 모킹):

```ts
import { describe, expect, it, vi } from 'vitest'

const mockFetch = vi.fn()

vi.mock('@shared/lib/api-client', () => ({
  clientFetch: (...args: unknown[]) => mockFetch(...args),
}))

describe('getStrategyOrdersPreview', () => {
  it('normalizes a null competition field to null', async () => {
    const { getStrategyOrdersPreview } = await import('./index')
    mockFetch.mockResolvedValueOnce({
      tradeDate: '2026-07-18',
      position: null,
      orders: [],
      skipReason: 'NO_CYCLE_HISTORY',
      todayOrders: [],
      otherStrategiesPlannedBuyUsd: '0',
      competition: null,
    })

    const result = await getStrategyOrdersPreview('strategy-1')

    expect(result.competition).toBeNull()
  })

  it('normalizes a populated competition field including nested competing strategies', async () => {
    const { getStrategyOrdersPreview } = await import('./index')
    mockFetch.mockResolvedValueOnce({
      tradeDate: '2026-07-18',
      position: null,
      orders: [],
      skipReason: null,
      todayOrders: [],
      otherStrategiesPlannedBuyUsd: '0',
      competition: {
        sufficientBudget: false,
        availableDeposit: 1000,
        requiredForThisStrategy: 200,
        consumedByHigherPriority: 900,
        blockedByHigherPriority: [
          { strategyId: 'vr-1', type: 'VR', ticker: 'TQQQ', requiredBuyUsd: 900, priority: 0 },
        ],
        uncertainStrategyIds: ['privacy-1'],
      },
    })

    const result = await getStrategyOrdersPreview('strategy-1')

    expect(result.competition).toEqual({
      sufficientBudget: false,
      availableDeposit: '1000',
      requiredForThisStrategy: '200',
      consumedByHigherPriority: '900',
      blockedByHigherPriority: [
        { strategyId: 'vr-1', type: 'VR', ticker: 'TQQQ', requiredBuyUsd: '900', priority: 0 },
      ],
      uncertainStrategyIds: ['privacy-1'],
    })
  })
})
```

- [ ] **Step 3: 테스트 실행 → 실패 확인**

Run: `npm run test:run -- entities/order/api/index.test.ts`
Expected: FAIL — `result.competition`이 `undefined`이거나 타입 에러(아직 `NextOrderPreview`에 `competition` 필드가 없음).

- [ ] **Step 4: `entities/order/model/types.ts`에 타입 추가**

`entities/order/model/types.ts`에서 `NextOrderPreview` 인터페이스 바로 앞에 다음을 추가:

```ts
export interface CompetingStrategy {
  strategyId: string
  type: string
  ticker: string
  requiredBuyUsd: string
  priority: number
}

export interface BuyCompetitionSummary {
  sufficientBudget: boolean
  availableDeposit: string
  requiredForThisStrategy: string
  consumedByHigherPriority: string
  blockedByHigherPriority: CompetingStrategy[]
  uncertainStrategyIds: string[]
}
```

그리고 `NextOrderPreview` 인터페이스에 필드 추가:

```ts
export interface NextOrderPreview {
  tradeDate: string
  position: NextOrderPositionSnapshot | null
  orders: NextOrderItem[]
  skipReason: SkipReason | null
  todayOrders: PlacedOrder[]               // 오늘 이미 등록된 PLANNED + PLACED 주문 (없으면 빈 배열)
  otherStrategiesPlannedBuyUsd: string     // 계좌 내 타 전략 당일 PLANNED BUY 합계
  competition: BuyCompetitionSummary | null // 계좌 내 BUY 예산 경쟁 시뮬레이션 결과 (BUY 없으면 null)
}
```

- [ ] **Step 5: `entities/order/api/index.ts`에 파싱 로직 추가**

`import type { NextOrderPreview, SkipReason, StrategyOrder } from '../model/types'`를 다음으로 교체:

```ts
import type { BuyCompetitionSummary, CompetingStrategy, NextOrderPreview, SkipReason, StrategyOrder } from '../model/types'
```

`normalizePreview` 함수 바로 앞에 헬퍼 2개 추가:

```ts
function normalizeCompetingStrategy(raw: unknown): CompetingStrategy {
  const item = raw as Record<string, unknown>
  return {
    strategyId: String(item.strategyId),
    type: String(item.type),
    ticker: String(item.ticker),
    requiredBuyUsd: String(item.requiredBuyUsd),
    priority: Number(item.priority),
  }
}

function normalizeCompetition(raw: unknown): BuyCompetitionSummary | null {
  if (raw == null) return null
  const r = raw as Record<string, unknown>
  return {
    sufficientBudget: Boolean(r.sufficientBudget),
    availableDeposit: String(r.availableDeposit ?? '0'),
    requiredForThisStrategy: String(r.requiredForThisStrategy ?? '0'),
    consumedByHigherPriority: String(r.consumedByHigherPriority ?? '0'),
    blockedByHigherPriority: ((r.blockedByHigherPriority as unknown[]) ?? []).map(normalizeCompetingStrategy),
    uncertainStrategyIds: ((r.uncertainStrategyIds as unknown[]) ?? []).map(String),
  }
}
```

`normalizePreview` 함수의 마지막 줄을 다음으로 교체:

```ts
// BEFORE
  const otherStrategiesPlannedBuyUsd = String(r.otherStrategiesPlannedBuyUsd ?? '0')
  return { tradeDate: String(r.tradeDate), position, orders, skipReason, todayOrders, otherStrategiesPlannedBuyUsd }
```

```ts
// AFTER
  const otherStrategiesPlannedBuyUsd = String(r.otherStrategiesPlannedBuyUsd ?? '0')
  const competition = normalizeCompetition(r.competition)
  return { tradeDate: String(r.tradeDate), position, orders, skipReason, todayOrders, otherStrategiesPlannedBuyUsd, competition }
```

- [ ] **Step 6: 테스트 실행 → 통과 확인**

Run: `npm run test:run -- entities/order/api/index.test.ts`
Expected: PASS (2개 테스트 모두)

- [ ] **Step 7: `entities/order/index.ts`에 신규 타입 export 추가**

```ts
// BEFORE
export type {
  NextOrderPositionSnapshot,
  NextOrderItem,
  SkipReason,
  NextOrderPreview,
  PlacedOrder,
  StrategyOrder,
} from './model/types'
```

```ts
// AFTER
export type {
  NextOrderPositionSnapshot,
  NextOrderItem,
  SkipReason,
  NextOrderPreview,
  PlacedOrder,
  StrategyOrder,
  BuyCompetitionSummary,
  CompetingStrategy,
} from './model/types'
```

- [ ] **Step 8: 타입 검사 + 전체 order 테스트 실행**

```bash
npm run typecheck
npm run test:run -- entities/order
```
Expected: 둘 다 통과, 에러 없음.

- [ ] **Step 9: 커밋**

```bash
git add entities/order/model/types.ts entities/order/api/index.ts entities/order/api/index.test.ts entities/order/index.ts
git commit -m "$(cat <<'EOF'
feat: entities/order에 BuyCompetitionSummary 도메인 타입 추가

NextOrderPreview.competition 필드 파싱 — normalizePreview()가 null 또는
경쟁 전략 목록 포함 객체를 정확히 정규화하도록 확장
EOF
)"
```

---

### Task 3: `BuyCompetitionNotice` 컴포넌트 신규 작성

**Files:**
- Create: `widgets/strategy-detail/BuyCompetitionNotice.tsx`
- Create: `widgets/strategy-detail/BuyCompetitionNotice.test.tsx`

**Interfaces:**
- Consumes: `BuyCompetitionSummary`(Task 2) — `@entities/order`에서 import.
- Produces: `BuyCompetitionNotice({ competition: BuyCompetitionSummary; deficitUsd: number; variant: 'inline' | 'row' }): JSX.Element` — Task 4가 `StrategyDetail.tsx`에서 데스크톱(`variant="inline"`)·모바일(`variant="row"`) 두 자리에 재사용.

`variant`별 차이: `inline`은 카드 헤더 아래 텍스트 색(`text-warn`)으로 이어지는 배치(기존 233~238행 스타일), `row`는 `CardContent` 내부 구분선 있는 전체 폭 행(기존 320~325행 스타일, `text-muted-foreground`). 두 인스턴스는 각자 독립된 펼침 상태를 가진다(상태 공유 안 함, 기존 데스크톱/모바일 이중 렌더 패턴과 동일).

- [ ] **Step 1: 실패하는 테스트 작성**

`widgets/strategy-detail/BuyCompetitionNotice.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { BuyCompetitionNotice } from './BuyCompetitionNotice'
import type { BuyCompetitionSummary } from '@entities/order'

const baseCompetition: BuyCompetitionSummary = {
  sufficientBudget: false,
  availableDeposit: '1000',
  requiredForThisStrategy: '200',
  consumedByHigherPriority: '900',
  blockedByHigherPriority: [
    { strategyId: 'vr-1', type: 'VR', ticker: 'TQQQ', requiredBuyUsd: '900', priority: 0 },
  ],
  uncertainStrategyIds: [],
}

describe('BuyCompetitionNotice', () => {
  it('shows the deficit amount and blocking strategy count', () => {
    render(<BuyCompetitionNotice competition={baseCompetition} deficitUsd={142.5} variant="inline" />)

    expect(screen.getByText('예수금 부족')).toBeInTheDocument()
    expect(screen.getByText(/142\.50 부족/)).toBeInTheDocument()
    expect(screen.getByText(/우선순위 전략 1개가 먼저 배정/)).toBeInTheDocument()
    expect(screen.queryByText(/VR \(TQQQ\)/)).not.toBeInTheDocument()
  })

  it('expands to show the blocking strategy list on toggle click', async () => {
    const user = userEvent.setup()
    render(<BuyCompetitionNotice competition={baseCompetition} deficitUsd={142.5} variant="row" />)

    await user.click(screen.getByRole('button', { name: /자세히/ }))

    expect(screen.getByText(/VR \(TQQQ\) — \$900\.00/)).toBeInTheDocument()
  })

  it('does not render a toggle when there are no blocking strategies', () => {
    render(<BuyCompetitionNotice competition={{ ...baseCompetition, blockedByHigherPriority: [] }} deficitUsd={200} variant="inline" />)

    expect(screen.queryByRole('button', { name: /자세히/ })).not.toBeInTheDocument()
  })

  it('shows an uncertainty note when expanded and uncertainStrategyIds is non-empty', async () => {
    const user = userEvent.setup()
    render(
      <BuyCompetitionNotice
        competition={{ ...baseCompetition, uncertainStrategyIds: ['privacy-1'] }}
        deficitUsd={142.5}
        variant="inline"
      />,
    )

    await user.click(screen.getByRole('button', { name: /자세히/ }))

    expect(screen.getByText(/일부 전략은 계산 불가로 정확하지 않을 수 있습니다/)).toBeInTheDocument()
  })
})
```

`@testing-library/user-event`는 `package.json`에 이미 설치돼 있음(`^14.6.1`) — 추가 설치 불필요.

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npm run test:run -- widgets/strategy-detail/BuyCompetitionNotice.test.tsx`
Expected: FAIL — `BuyCompetitionNotice` 모듈 없음.

- [ ] **Step 3: `BuyCompetitionNotice.tsx` 구현**

```tsx
'use client'

import { useState } from 'react'
import { Badge } from '@shared/ui/Badge'
import { fmtUsd } from '@shared/lib/format'
import { toNum } from '@shared/lib/utils'
import type { BuyCompetitionSummary } from '@entities/order'

interface Props {
  competition: BuyCompetitionSummary
  deficitUsd: number
  variant: 'inline' | 'row'
}

// "다음 주문" 카드의 예수금 부족 경고 — 데스크톱(inline)·모바일(row) 두 자리에서 재사용, 펼침 상태는 인스턴스별 독립
export function BuyCompetitionNotice({ competition, deficitUsd, variant }: Props) {
  const [expanded, setExpanded] = useState(false)
  const blocked = competition.blockedByHigherPriority
  const hasBlocked = blocked.length > 0

  const wrapperClass = variant === 'inline'
    ? 'hidden lg:flex flex-col gap-1 mt-1.5'
    : 'lg:hidden px-6 py-2.5 border-b border-border flex flex-col gap-1'
  const textClass = variant === 'inline'
    ? 'flex items-center gap-1.5 flex-wrap text-sm lg:text-base text-warn'
    : 'flex items-center gap-1.5 flex-wrap text-sm text-muted-foreground'
  const badgeClass = variant === 'inline' ? 'lg:h-[24px] lg:text-sm' : ''

  return (
    <div className={wrapperClass}>
      <p className={textClass}>
        <Badge tone="warn" size="sm" className={badgeClass}>예수금 부족</Badge>
        <span>{`$${fmtUsd(deficitUsd)} 부족`}{hasBlocked ? ` (우선순위 전략 ${blocked.length}개가 먼저 배정)` : ''}</span>
        {hasBlocked && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground"
          >
            {expanded ? '자세히 ▴' : '자세히 ▾'}
          </button>
        )}
      </p>
      {expanded && hasBlocked && (
        <ul className="ml-1 space-y-0.5 text-xs text-muted-foreground list-disc list-inside">
          {blocked.map((s) => (
            <li key={s.strategyId}>{`${s.type} (${s.ticker}) — $${fmtUsd(toNum(s.requiredBuyUsd))}`}</li>
          ))}
        </ul>
      )}
      {expanded && competition.uncertainStrategyIds.length > 0 && (
        <p className="text-xs text-muted-foreground">⚠ 일부 전략은 계산 불가로 정확하지 않을 수 있습니다</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `npm run test:run -- widgets/strategy-detail/BuyCompetitionNotice.test.tsx`
Expected: PASS (4개 테스트 모두)

- [ ] **Step 5: 타입 검사**

Run: `npm run typecheck`
Expected: 에러 없음.

- [ ] **Step 6: 커밋**

```bash
git add widgets/strategy-detail/BuyCompetitionNotice.tsx widgets/strategy-detail/BuyCompetitionNotice.test.tsx
git commit -m "$(cat <<'EOF'
feat: BuyCompetitionNotice 컴포넌트 추가

예수금 부족 배지 + 부족액 + 우선순위 경쟁 전략 목록(펼침형) 표시.
아직 StrategyDetail에는 미연결 — 다음 커밋에서 연결
EOF
)"
```

---

### Task 4: `StrategyDetail.tsx` 연동 — 클라이언트 계산 제거 + 서버 competition 소비

**Files:**
- Modify: `widgets/strategy-detail/StrategyDetail.tsx`
- Modify: `widgets/strategy-detail/StrategyDetail.test.tsx`

**Interfaces:**
- Consumes: `BuyCompetitionNotice`(Task 3), `NextOrderPreview.competition`(Task 2).

- [ ] **Step 1: 기존 import 정리**

`widgets/strategy-detail/StrategyDetail.tsx`에서:

```ts
// BEFORE (24행)
import { useAccountMarginQuery } from '@entities/account'
```

이 줄을 삭제한다. 대신 컴포넌트 import 추가(35행 `import { OrderRows } from './OrderRows'` 다음 줄에):

```ts
import { BuyCompetitionNotice } from './BuyCompetitionNotice'
```

- [ ] **Step 2: 계산 로직 교체**

```ts
// BEFORE (71~80행)
  // 매수 주문이 있을 때만 브로커 실잔고 조회 — 부족분은 프론트에서 계산
  const hasBuyOrders = orders.some((o) => o.direction === 'BUY')
  const { items: marginItems, isLoading: isMarginLoading } = useAccountMarginQuery(accountId, {
    enabled: !isLoadingPreview && hasBuyOrders,
  })
  const totalBuyUsd = hasBuyOrders && !isMarginLoading ? orders.filter((o) => o.direction === 'BUY').reduce((sum, o) => sum + toNum(o.price) * o.quantity, 0) : 0
  const purchasableUsd = marginItems.find((i) => i.currency === 'USD')?.purchasableAmount ?? 0
  const otherPlannedUsd = toNum(preview?.otherStrategiesPlannedBuyUsd ?? '0')
  const previewDeficit = hasBuyOrders && !isMarginLoading ? Math.max(0, totalBuyUsd + otherPlannedUsd - purchasableUsd) : 0
  const hasDeficit = previewDeficit > 0
```

```ts
// AFTER
  // 매수 주문이 있으면 서버 예산 경쟁 시뮬레이션 결과(competition)로 부족 여부·부족액 판정
  const hasBuyOrders = orders.some((o) => o.direction === 'BUY')
  const competition = preview?.competition ?? null
  const hasDeficit = hasBuyOrders && competition ? !competition.sufficientBudget : false
  const deficitUsd = competition
    ? Math.max(0, toNum(competition.consumedByHigherPriority) + toNum(competition.requiredForThisStrategy) - toNum(competition.availableDeposit))
    : 0
```

- [ ] **Step 3: 데스크톱 배지 자리 교체**

```tsx
// BEFORE (233~238행)
              {hasBuyOrders && !isMarginLoading && hasDeficit && (
                <p className="hidden lg:flex items-center gap-1.5 mt-1.5 text-sm lg:text-base text-warn">
                  <Badge tone="warn" size="sm" className="lg:h-[24px] lg:text-sm">예수금 부족</Badge>
                  ${fmtUsd(previewDeficit)} 부족
                </p>
              )}
```

```tsx
// AFTER
              {hasDeficit && competition && (
                <BuyCompetitionNotice competition={competition} deficitUsd={deficitUsd} variant="inline" />
              )}
```

- [ ] **Step 4: "바로 주문" 버튼 disabled 조건에서 `isMarginLoading` 제거**

```tsx
// BEFORE (262행)
                  disabled={executeMutation.isPending || orders.length === 0 || isMarginLoading}
```

```tsx
// AFTER
                  disabled={executeMutation.isPending || orders.length === 0}
```

- [ ] **Step 5: 모바일 스켈레톤 + 배지 자리 교체**

```tsx
// BEFORE (315~325행)
              {hasBuyOrders && isMarginLoading && (
                <div className="px-6 py-3 border-b border-border">
                  <Skeleton className="h-4 w-64" />
                </div>
              )}
              {hasBuyOrders && !isMarginLoading && hasDeficit && (
                <div className="lg:hidden px-6 py-2.5 border-b border-border flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge tone="warn" size="sm">예수금 부족</Badge>
                  {`$${fmtUsd(previewDeficit)} 부족`}
                </div>
              )}
```

```tsx
// AFTER
              {hasDeficit && competition && (
                <BuyCompetitionNotice competition={competition} deficitUsd={deficitUsd} variant="row" />
              )}
```

`Skeleton` 컴포넌트는 이 파일에서 방금 제거한 블록(구 317행)에서만 쓰였다(199~205행의 `KpiCard ... skeleton` prop은 `@widgets/kpi-card`의 자체 prop이라 이 import와 무관, `grep -n "Skeleton" widgets/strategy-detail/StrategyDetail.tsx`로 사전 확인됨). 32행의 import도 함께 삭제한다:

```ts
// 삭제
import { Skeleton } from '@/components/ui/skeleton'
```

- [ ] **Step 6: 타입 검사**

Run: `npm run typecheck`
Expected: 에러 없음. `orders.filter/reduce` 등 제거된 계산에 대한 미사용 변수 경고가 없는지 확인(`totalBuyUsd`/`purchasableUsd`/`otherPlannedUsd`/`previewDeficit`/`marginItems`/`isMarginLoading` 전부 제거됐어야 함).

- [ ] **Step 7: `StrategyDetail.test.tsx` 갱신**

`@entities/account` 모킹 블록 제거:

```ts
// BEFORE (85~87행)
vi.mock('@entities/account', () => ({
  useAccountMarginQuery: () => ({ items: [], isLoading: false }),
}))
```

이 블록을 삭제한다(더 이상 `StrategyDetail.tsx`가 `@entities/account`를 import하지 않음).

`@entities/order` 모킹을 오버라이드 가능한 형태로 교체:

```ts
// BEFORE (74~83행)
vi.mock('@entities/order', () => ({
  useStrategyOrderPreviewQuery: () => ({
    data: { todayOrders: [], position: null, orders: [], skipReason: 'NO_CYCLE_HISTORY', otherStrategiesPlannedBuyUsd: '0' },
    isLoading: false,
    isError: false,
    error: null,
  }),
  useCancelAllOrdersMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useCancelOneOrderMutation: () => ({ mutate: vi.fn(), isPending: false, variables: null }),
}))
```

```ts
// AFTER
const mockPreviewQuery = vi.fn(() => ({
  data: { todayOrders: [], position: null, orders: [], skipReason: 'NO_CYCLE_HISTORY', otherStrategiesPlannedBuyUsd: '0', competition: null },
  isLoading: false,
  isError: false,
  error: null,
}))

vi.mock('@entities/order', () => ({
  useStrategyOrderPreviewQuery: () => mockPreviewQuery(),
  useCancelAllOrdersMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useCancelOneOrderMutation: () => ({ mutate: vi.fn(), isPending: false, variables: null }),
}))
```

파일 하단(마지막 `describe` 블록 앞)에 신규 `describe` 블록 추가:

```tsx
describe('StrategyDetail buy competition notice', () => {
  it('shows the deficit badge and amount when competition reports insufficient budget', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [],
        position: null,
        orders: [{ ticker: 'TSLA', orderType: 'LOC', direction: 'BUY', quantity: 5, price: '20.00' }],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        competition: {
          sufficientBudget: false,
          availableDeposit: '1000',
          requiredForThisStrategy: '200',
          consumedByHigherPriority: '900',
          blockedByHigherPriority: [
            { strategyId: 'vr-1', type: 'VR', ticker: 'TQQQ', requiredBuyUsd: '900', priority: 0 },
          ],
          uncertainStrategyIds: [],
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.getAllByText('예수금 부족').length).toBeGreaterThan(0)
  })

  it('does not show the deficit badge when competition reports sufficient budget', () => {
    mockPreviewQuery.mockReturnValueOnce({
      data: {
        todayOrders: [],
        position: null,
        orders: [{ ticker: 'TSLA', orderType: 'LOC', direction: 'BUY', quantity: 5, price: '20.00' }],
        skipReason: null,
        otherStrategiesPlannedBuyUsd: '0',
        competition: {
          sufficientBudget: true,
          availableDeposit: '1000',
          requiredForThisStrategy: '200',
          consumedByHigherPriority: '0',
          blockedByHigherPriority: [],
          uncertainStrategyIds: [],
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    })

    render(<StrategyDetail accountId="account-1" strategy={baseStrategy} />)

    expect(screen.queryByText('예수금 부족')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 8: 전체 위젯 테스트 실행**

Run: `npm run test:run -- widgets/strategy-detail`
Expected: 기존 테스트(header card 5건) + 신규 2건 모두 PASS.

- [ ] **Step 9: 타입 검사 재확인**

Run: `npm run typecheck`
Expected: 에러 없음.

- [ ] **Step 10: 커밋**

```bash
git add "widgets/strategy-detail/StrategyDetail.tsx" "widgets/strategy-detail/StrategyDetail.test.tsx"
git commit -m "$(cat <<'EOF'
feat: 다음 주문 카드 예수금 부족 판정을 서버 competition 값으로 교체

useAccountMarginQuery 기반 클라이언트 계산 제거 — BuyCompetitionNotice로
우선순위 경쟁 반영된 서버 판정(sufficientBudget)을 표시
EOF
)"
```

---

### Task 5: 전체 검증

**Files:** 없음 (검증 전용)

**Interfaces:** 없음

- [ ] **Step 1: 타입 검사**

Run: `npm run typecheck`
Expected: 에러 없음.

- [ ] **Step 2: 전체 테스트 스위트**

Run: `npm run test:run`
Expected: 전체 PASS, 실패 없음.

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공(런타임 오류 없이 프로덕션 번들 생성).

이 태스크는 검증 전용 — 코드 변경 없으므로 커밋 없음. 실패 시 원인 태스크로 돌아가 수정.

## Self-Review 결과

- **스펙 커버리지**: 설계 문서의 타입 정의(Task 2), 반영 절차(Task 1), StrategyDetail 로직 변경(Task 4), UI 컴포넌트(Task 3), 엣지 케이스(Task 3·4 전반에 분산 반영: `hasBuyOrders && !competition` 방어, `sufficientBudget=true` 시 배지 없음, `blockedByHigherPriority` 빈 배열 시 토글 숨김, `uncertainStrategyIds` 조건부 문구)까지 전부 태스크로 매핑됨.
- **플레이스홀더 스캔**: 전 스텝에 실제 코드/명령어 포함. "TBD" 없음.
- **타입 일관성**: `BuyCompetitionSummary`/`CompetingStrategy` 필드명이 Task 2(도메인 타입)→Task 3(컴포넌트 props)→Task 4(StrategyDetail 소비)에서 동일하게 사용됨을 재확인. `BuyCompetitionNotice`의 `variant: 'inline' | 'row'` prop명이 Task 3 정의와 Task 4 사용처에서 일치.
- **설계 스펙과의 차이점(구현 세부사항으로 계획 단계에서 확정)**: 스펙 문서는 `type`/`ticker`를 느슨하게 언급했으나, 계획에서는 `entities/order` 모듈의 기존 관례(`NextOrderItem`이 loose string 사용)를 조사해 `CompetingStrategy.type`/`.ticker`를 `string`으로 확정하고 `api-schema.ts` 수정을 범위에서 제외함 — 스펙의 의도(정확한 타입 매핑)는 유지하되 프로젝트 기존 패턴과 일관되게 조정.
