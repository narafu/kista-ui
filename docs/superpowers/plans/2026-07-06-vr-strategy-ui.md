# VR Strategy UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `kista-api`의 VR 전략 등록·조회 계약을 `kista-ui` 전략 생성/상세 UI에 반영해 사용자가 VR 전략을 등록하고 VR 전용 값을 확인할 수 있게 한다.

**Architecture:** `openapi.json`과 generated API types를 먼저 백엔드 최신 계약으로 갱신하고, `entities/strategy`에서 VR 필드를 정규화한다. 생성 폼은 기존 seed 입력을 VR의 초기 pool(`initialUsdDeposit`)로 재사용하고, VR 전용 입력 섹션이 `initialValue`, `intervalWeeks`, `bandWidth`, `recurringAmount`를 관리한다. 상세/카드 UI는 `divisionCounts.length === 0`을 PRIVACY로 단정하지 않고 `strategy.vr` 존재 여부로 VR 요약을 표시한다.

**Tech Stack:** Next.js 16, React 19, TypeScript, React Hook Form, Zod, React Query, Vitest, OpenAPI generated types, Spring Boot kista-api contract

## Global Constraints

- Work in `kista-ui` branch `feat/vr-strategy-ui-plan` or a follow-up branch derived from it.
- Do not edit `shared/lib/api-types.ts` by hand; update `openapi.json`, then run `npm run gen:types`.
- `kista-api` VR request fields are `initialValue`, `intervalWeeks`, `bandWidth`, `recurringAmount`.
- `initialUsdDeposit` means VR initial pool and must be greater than 0.
- `initialValue` must be greater than 0.
- `intervalWeeks` must be an integer greater than or equal to 1.
- `bandWidth` must be greater than 0 and is entered as percent, for example `15.00`.
- `recurringAmount` is an integer and may be positive, zero, or negative; empty UI input must be submitted as `0`.
- Backend forces VR ticker to `TQQQ` and VR `cycleSeedType` to `NONE`; UI must not imply VR supports next-cycle seed modes.
- `StrategyTypeMeta.divisionCounts.length === 0` means only "no division count"; it must not be used as a PRIVACY-only check.
- Client Components must call `kista-api` through existing entity API functions and route handlers, not directly.
- Keep FSD boundaries: `features -> entities -> shared`, `widgets -> features/entities/shared`.
- Use existing rose/card visual language and section components; do not introduce a new design system.
- Follow TDD for behavior changes and run focused Vitest plus `npm run typecheck` before final commit.

---

## File Structure

- Modify: `openapi.json`  
  Role: latest backend OpenAPI contract containing `VR`, VR request fields, `TradingCycleResponse.vr`, `currentRound`, and `currentHoldings`.
- Modify generated: `shared/lib/api-types.ts`  
  Role: generated TypeScript OpenAPI types from `openapi.json`.
- Modify: `shared/lib/api-schema.ts`  
  Role: exported enum-derived types stay sourced from generated schemas.
- Modify: `entities/strategy/model/types.ts`  
  Role: domain-facing `Strategy`, `StrategyRequest`, and new `StrategyVrSummary` shape.
- Modify: `entities/strategy/api/index.ts`  
  Role: normalize backend VR response and preserve VR request payload.
- Modify: `entities/strategy/hooks/useStrategyQueries.ts`  
  Role: keep existing mutation/query behavior and invalidate relevant caches after VR create/update.
- Modify: `features/strategy/create-strategy/model/strategyFormSchema.ts`  
  Role: validate common form fields plus VR-only fields.
- Modify: `features/strategy/create-strategy/model/useStrategyForm.ts`  
  Role: manage VR form state, VR submit payload, VR seed-preview bypass, and VR cycle seed UI policy.
- Create: `features/strategy/create-strategy/sections/VrSettingsSection.tsx`  
  Role: render VR-specific inputs for initial V, interval weeks, band width, and recurring amount.
- Modify: `features/strategy/create-strategy/StrategyForm.tsx`  
  Role: insert VR settings section and hide non-applicable sections for VR.
- Modify: `features/strategy/create-strategy/StrategyFormSkeleton.tsx` if layout changes create a visible loading mismatch.
- Modify: `widgets/strategy-detail/StrategyDetail.tsx`  
  Role: display VR summary KPI values and avoid PRIVACY labels for VR.
- Modify: `widgets/strategy-card/StrategyCard.tsx`  
  Role: show a compact VR marker or V/pool summary instead of omitting all non-division strategy detail.
- Modify tests:
  `entities/strategy/api/index.test.ts`,
  `features/strategy/create-strategy/model/strategyFormSchema.test.ts`,
  `features/strategy/create-strategy/model/useStrategyForm.test.ts`,
  `features/strategy/create-strategy/StrategyForm.test.tsx`,
  `widgets/strategy-detail/StrategyDetail.test.tsx`,
  `widgets/strategy-card/StrategyCard.test.tsx`.
- Modify docs:
  `docs/agents/entities.md`,
  `docs/agents/features.md`,
  `docs/agents/widgets.md`.

---

### Task 1: Sync OpenAPI Contract And Generated Types

**Files:**
- Modify: `openapi.json`
- Modify generated: `shared/lib/api-types.ts`
- Inspect: `../kista-api/src/main/java/com/kista/adapter/in/web/dto/TradingCycleRequest.java`
- Inspect: `../kista-api/src/main/java/com/kista/adapter/in/web/dto/TradingCycleResponse.java`
- Inspect: `../kista-api/src/main/java/com/kista/adapter/in/web/dto/StrategyTypeMeta.java`

**Interfaces:**
- Consumes: `GET http://localhost:8080/api-docs` from local `kista-api`
- Produces: generated schemas where `TradingCycleRequest.type` includes `VR`, request has `initialValue`, `intervalWeeks`, `bandWidth`, `recurringAmount`, and response has nullable `vr`

- [ ] **Step 1: Confirm backend contract fields from source**

Run:
```bash
cd /Users/phs/workspace/kista/kista-api
sed -n '1,120p' src/main/java/com/kista/adapter/in/web/dto/TradingCycleRequest.java
sed -n '1,120p' src/main/java/com/kista/adapter/in/web/dto/TradingCycleResponse.java
```

Expected source facts:
```text
TradingCycleRequest fields:
type, ticker, initialUsdDeposit, cycleSeedType, divisionCount,
initialValue, intervalWeeks, bandWidth, recurringAmount

TradingCycleResponse fields:
id, accountId, type, status, ticker, initialUsdDeposit, cycleSeedType,
divisionCount, isReverseMode, currentRound, currentHoldings, vr

TradingCycleResponse.VrSummary fields:
value, bandWidth, intervalWeeks, recurringAmount, poolLimit, gradient
```

- [ ] **Step 2: Refresh OpenAPI from local API**

If the API is not running, start it in another terminal:
```bash
cd /Users/phs/workspace/kista/kista-api
./gradlew bootRun --args='--spring.profiles.active=local'
```

Then fetch the spec:
```bash
cd /Users/phs/workspace/kista/kista-ui
npm run fetch:spec
```

Expected:
```text
openapi.json updated from http://localhost:8080/api-docs
```

- [ ] **Step 3: Verify OpenAPI contains VR fields**

Run:
```bash
cd /Users/phs/workspace/kista/kista-ui
node -e "const s=require('./openapi.json').components.schemas; console.log(JSON.stringify({type:s.TradingCycleRequest.properties.type.enum, request:Object.keys(s.TradingCycleRequest.properties), response:Object.keys(s.TradingCycleResponse.properties), vr:s.TradingCycleResponse.properties.vr}, null, 2))"
```

Expected output contains:
```json
{
  "type": ["INFINITE", "PRIVACY", "VR"],
  "request": ["type", "ticker", "initialUsdDeposit", "cycleSeedType", "divisionCount", "initialValue", "intervalWeeks", "bandWidth", "recurringAmount"],
  "response": ["id", "accountId", "type", "status", "ticker", "initialUsdDeposit", "cycleSeedType", "divisionCount", "isReverseMode", "currentRound", "currentHoldings", "vr"]
}
```

- [ ] **Step 4: Regenerate generated API types**

Run:
```bash
cd /Users/phs/workspace/kista/kista-ui
npm run gen:types
```

Expected:
```text
shared/lib/api-types.ts regenerated without errors
```

- [ ] **Step 5: Commit contract sync**

Run:
```bash
cd /Users/phs/workspace/kista/kista-ui
git add openapi.json shared/lib/api-types.ts
git commit -m "chore: VR 전략 API 타입 동기화"
```

---

### Task 2: Add Strategy VR Types And Normalization

**Files:**
- Modify: `entities/strategy/model/types.ts`
- Modify: `entities/strategy/api/index.ts`
- Create: `entities/strategy/api/index.test.ts`

**Interfaces:**
- Consumes: backend `TradingCycleResponse.vr`
- Produces:
```ts
export interface StrategyVrSummary {
  value: number
  bandWidth: number
  intervalWeeks: number
  recurringAmount: number
  poolLimit: number
  gradient: number
}

export interface Strategy {
  vr?: StrategyVrSummary
}

export interface StrategyRequest {
  initialValue?: number
  intervalWeeks?: number
  bandWidth?: number
  recurringAmount?: number
}
```

- [ ] **Step 1: Write failing normalization tests**

Create `entities/strategy/api/index.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'

const fetchEitherMock = vi.fn()

vi.mock('@shared/lib/api-client', () => ({
  fetchEither: (...args: unknown[]) => fetchEitherMock(...args),
  clientFetch: vi.fn(),
  jsonBody: (method: string, body: unknown) => ({ method, body: JSON.stringify(body) }),
}))

vi.mock('@shared/lib/utils', () => ({
  toNum: (value: unknown) => Number(value),
}))

describe('strategy api normalization', () => {
  it('normalizes VR summary numbers and preserves null divisionCount as undefined-like UI data', async () => {
    const { listStrategies } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce([
      {
        id: 'strategy-1',
        accountId: 'account-1',
        type: 'VR',
        status: 'ACTIVE',
        ticker: 'TQQQ',
        initialUsdDeposit: '2000.00',
        cycleSeedType: 'NONE',
        divisionCount: null,
        isReverseMode: false,
        currentRound: null,
        currentHoldings: 4,
        vr: {
          value: '3000.00',
          bandWidth: '15.00',
          intervalWeeks: 4,
          recurringAmount: 0,
          poolLimit: '1000.00',
          gradient: 10,
        },
      },
    ])

    const result = await listStrategies('account-1')

    expect(result[0]).toEqual(expect.objectContaining({
      type: 'VR',
      ticker: 'TQQQ',
      divisionCount: undefined,
      currentHoldings: 4,
      vr: {
        value: 3000,
        bandWidth: 15,
        intervalWeeks: 4,
        recurringAmount: 0,
        poolLimit: 1000,
        gradient: 10,
      },
    }))
  })
})
```

- [ ] **Step 2: Run RED test**

Run:
```bash
cd /Users/phs/workspace/kista/kista-ui
npm run test:run -- entities/strategy/api/index.test.ts
```

Expected:
```text
FAIL because Strategy.vr is missing and divisionCount null currently becomes 20
```

- [ ] **Step 3: Update domain model types**

Modify `entities/strategy/model/types.ts`:
```ts
export interface StrategyVrSummary {
  value: number
  bandWidth: number
  intervalWeeks: number
  recurringAmount: number
  poolLimit: number
  gradient: number
}

export interface Strategy {
  id: string
  accountId: string
  type: string
  status: string
  ticker: string
  cycleSeedType: CycleSeedType
  initialUsdDeposit?: number
  divisionCount?: number
  isReverseMode: boolean
  currentRound?: number
  currentHoldings?: number
  vr?: StrategyVrSummary
}

export interface StrategyRequest {
  type: string
  ticker?: string
  cycleSeedType: CycleSeedType
  initialUsdDeposit?: number
  divisionCount?: number
  initialValue?: number
  intervalWeeks?: number
  bandWidth?: number
  recurringAmount?: number
}
```

- [ ] **Step 4: Update normalizer**

In `entities/strategy/api/index.ts`, add:
```ts
function normalizeVrSummary(raw: unknown): Strategy['vr'] {
  if (raw == null) return undefined
  const v = raw as Record<string, unknown>
  return {
    value: toNum(v.value),
    bandWidth: toNum(v.bandWidth),
    intervalWeeks: Number(v.intervalWeeks),
    recurringAmount: Number(v.recurringAmount ?? 0),
    poolLimit: toNum(v.poolLimit),
    gradient: Number(v.gradient),
  }
}
```

Then update `normalizeStrategy()`:
```ts
divisionCount: s.divisionCount != null ? Number(s.divisionCount) : undefined,
currentRound: s.currentRound != null ? Number(s.currentRound) : undefined,
currentHoldings: s.currentHoldings != null ? Number(s.currentHoldings) : undefined,
vr: normalizeVrSummary(s.vr),
```

- [ ] **Step 5: Run GREEN test**

Run:
```bash
cd /Users/phs/workspace/kista/kista-ui
npm run test:run -- entities/strategy/api/index.test.ts
```

Expected:
```text
PASS
```

- [ ] **Step 6: Commit model/API normalization**

Run:
```bash
cd /Users/phs/workspace/kista/kista-ui
git add entities/strategy/model/types.ts entities/strategy/api/index.ts entities/strategy/api/index.test.ts
git commit -m "feat: VR 전략 응답 정규화 추가"
```

---

### Task 3: Add VR Form State, Validation, And Payload

**Files:**
- Modify: `features/strategy/create-strategy/model/strategyFormSchema.ts`
- Modify: `features/strategy/create-strategy/model/strategyFormSchema.test.ts`
- Modify: `features/strategy/create-strategy/model/useStrategyForm.ts`
- Modify: `features/strategy/create-strategy/model/useStrategyForm.test.ts`

**Interfaces:**
- Consumes: selected `type`
- Produces:
```ts
vrFields: {
  initialValue: number | null
  intervalWeeks: number | null
  bandWidth: number | null
  recurringAmount: number | null
}
setVrField: (field: keyof VrFields, value: number | null) => void
isVr: boolean
```

- [ ] **Step 1: Write failing schema tests**

Append to `features/strategy/create-strategy/model/strategyFormSchema.test.ts`:
```ts
it('VR 필수 필드가 유효하면 파싱 성공', () => {
  const result = strategyFormSchema.safeParse({
    type: 'VR',
    ticker: 'TQQQ',
    autoStart: false,
    seedMode: 'KEEP',
    divisionCount: 20,
    initialValue: 3000,
    intervalWeeks: 4,
    bandWidth: 15,
    recurringAmount: 0,
  })

  expect(result.success).toBe(true)
})

it('VR recurringAmount는 음수를 허용한다', () => {
  const result = strategyFormSchema.safeParse({
    type: 'VR',
    ticker: 'TQQQ',
    autoStart: false,
    seedMode: 'KEEP',
    divisionCount: 20,
    initialValue: 3000,
    intervalWeeks: 4,
    bandWidth: 15,
    recurringAmount: -100,
  })

  expect(result.success).toBe(true)
})

it('VR intervalWeeks는 1 이상 정수여야 한다', () => {
  const result = strategyFormSchema.safeParse({
    type: 'VR',
    ticker: 'TQQQ',
    autoStart: false,
    seedMode: 'KEEP',
    divisionCount: 20,
    initialValue: 3000,
    intervalWeeks: 0,
    bandWidth: 15,
    recurringAmount: 0,
  })

  expect(result.success).toBe(false)
})
```

- [ ] **Step 2: Write failing submit tests**

Append to `features/strategy/create-strategy/model/useStrategyForm.test.ts`:
```ts
it('VR create payload includes VR fields and forces cycleSeedType NONE', async () => {
  seedModelState.seedUsd = 2000

  const { result } = renderHook(() =>
    useStrategyForm({
      accountId: 'account-1',
    }),
  )

  act(() => {
    result.current.setType('VR')
    result.current.setVrField('initialValue', 3000)
    result.current.setVrField('intervalWeeks', 4)
    result.current.setVrField('bandWidth', 15)
    result.current.setVrField('recurringAmount', null)
  })

  await act(async () => {
    result.current.handleSubmit({ preventDefault() {} } as React.FormEvent)
  })

  await waitFor(() => {
    expect(mockCreateMutate).toHaveBeenCalled()
  })

  expect(mockCreateMutate).toHaveBeenCalledWith({
    type: 'VR',
    ticker: 'TQQQ',
    cycleSeedType: 'NONE',
    initialUsdDeposit: 2000,
    initialValue: 3000,
    intervalWeeks: 4,
    bandWidth: 15,
    recurringAmount: 0,
  })
})

it('VR create is blocked until initialValue intervalWeeks and bandWidth are valid', () => {
  const { result } = renderHook(() =>
    useStrategyForm({
      accountId: 'account-1',
    }),
  )

  act(() => {
    result.current.setType('VR')
    result.current.setVrField('initialValue', null)
    result.current.setVrField('intervalWeeks', 4)
    result.current.setVrField('bandWidth', 15)
  })

  expect(result.current.cannotSubmit).toBe(true)
})
```

Adjust the test mock `findStrategyType` so it returns VR meta when the watched type is `VR`:
```ts
findStrategyType: (code: string) => code === 'VR'
  ? {
      code: 'VR',
      availableTickers: ['TQQQ'],
      requiresPrivacyBase: false,
      tickerFixed: true,
      supportsReverseMode: false,
      divisionCounts: [],
    }
  : {
      code: 'INFINITE',
      availableTickers: ['TSLA'],
      requiresPrivacyBase: false,
      tickerFixed: false,
      supportsReverseMode: false,
      divisionCounts: [20, 30, 40],
    },
```

- [ ] **Step 3: Run RED tests**

Run:
```bash
cd /Users/phs/workspace/kista/kista-ui
npm run test:run -- features/strategy/create-strategy/model/strategyFormSchema.test.ts features/strategy/create-strategy/model/useStrategyForm.test.ts
```

Expected:
```text
FAIL because VR form fields and setVrField do not exist
```

- [ ] **Step 4: Extend schema**

Modify `features/strategy/create-strategy/model/strategyFormSchema.ts`:
```ts
export const strategyFormSchema = z.object({
  type: z.string().min(1, '전략 타입을 선택하세요'),
  ticker: z.string().min(1, '종목을 선택하세요'),
  autoStart: z.boolean(),
  seedMode: z.enum(['KEEP', 'MAX']),
  divisionCount: z.number().int().min(10).max(50),
  initialValue: z.number().positive().nullable().optional(),
  intervalWeeks: z.number().int().min(1).nullable().optional(),
  bandWidth: z.number().positive().nullable().optional(),
  recurringAmount: z.number().int().nullable().optional(),
})
```

- [ ] **Step 5: Extend `UseStrategyFormReturn`**

In `useStrategyForm.ts`, add:
```ts
export interface VrFields {
  initialValue: number | null
  intervalWeeks: number | null
  bandWidth: number | null
  recurringAmount: number | null
}
```

Add to `UseStrategyFormReturn`:
```ts
isVr: boolean
vrFields: VrFields
setVrField: (field: keyof VrFields, value: number | null) => void
```

- [ ] **Step 6: Add defaults and watched VR values**

In `useForm` defaults:
```ts
initialValue: initial?.vr?.value ?? null,
intervalWeeks: initial?.vr?.intervalWeeks ?? 4,
bandWidth: initial?.vr?.bandWidth ?? 15,
recurringAmount: initial?.vr?.recurringAmount ?? 0,
```

After existing `form.watch(...)` calls:
```ts
const initialValue = form.watch('initialValue') ?? null
const intervalWeeks = form.watch('intervalWeeks') ?? null
const bandWidth = form.watch('bandWidth') ?? null
const recurringAmount = form.watch('recurringAmount') ?? null
const isVr = type === 'VR'
const vrFields = { initialValue, intervalWeeks, bandWidth, recurringAmount }
```

- [ ] **Step 7: Skip seed preview dependency for VR**

Change seed preview query:
```ts
const seedPreview = useStrategySeedPreviewQuery(
  accountId,
  { type, ticker, divisionCount },
  { enabled: !!type && !!ticker && !isVr },
)
```

Set base/min values:
```ts
const basePrice = isVr ? null : seedPreview.data?.basePrice ?? null
const minSeed = isVr ? null : seedPreview.data?.minSeed ?? null
const seedUnavailableReason = isVr ? null : seedPreview.data?.skipReason ?? null
```

- [ ] **Step 8: Force VR cycle seed policy in UI state**

Set:
```ts
const cycleSeedType: CycleSeedType = isVr
  ? 'NONE'
  : !autoStart
    ? 'NONE'
    : seedMode === 'KEEP'
      ? 'MAINTAIN'
      : 'MAX'
```

- [ ] **Step 9: Add VR validation and payload**

Before `cannotSubmit`, add:
```ts
const isInvalidVr = isVr && (
  initialValue === null ||
  initialValue <= 0 ||
  intervalWeeks === null ||
  intervalWeeks < 1 ||
  !Number.isInteger(intervalWeeks) ||
  bandWidth === null ||
  bandWidth <= 0 ||
  recurringAmount !== null && !Number.isInteger(recurringAmount)
)
```

Update `cannotSubmit`:
```ts
const cannotSubmit = initial && !canEditSeed
  ? false
  : isInvalidVr || isBelowMinSeed || isInvalidSeed || (!isVr && basePrice === null && seedUnavailableReason === null)
```

In create payload:
```ts
const payload: StrategyRequest = initial
  ? {
      type: initial.type,
      ticker: initial.ticker,
      cycleSeedType,
      ...(canEditSeed ? { initialUsdDeposit: seedUsd ?? undefined } : {}),
    }
  : {
      type,
      ticker,
      cycleSeedType,
      initialUsdDeposit: seedUsd ?? undefined,
      ...(usesDivisionCount ? { divisionCount } : {}),
      ...(isVr ? {
        initialValue: initialValue ?? undefined,
        intervalWeeks: intervalWeeks ?? undefined,
        bandWidth: bandWidth ?? undefined,
        recurringAmount: recurringAmount ?? 0,
      } : {}),
    }
```

- [ ] **Step 10: Add setter**

Add:
```ts
function setVrField(field: keyof VrFields, value: number | null) {
  form.setValue(field, value)
}
```

Return:
```ts
isVr,
vrFields,
setVrField,
```

- [ ] **Step 11: Run GREEN tests**

Run:
```bash
cd /Users/phs/workspace/kista/kista-ui
npm run test:run -- features/strategy/create-strategy/model/strategyFormSchema.test.ts features/strategy/create-strategy/model/useStrategyForm.test.ts
```

Expected:
```text
PASS
```

- [ ] **Step 12: Commit form model work**

Run:
```bash
cd /Users/phs/workspace/kista/kista-ui
git add features/strategy/create-strategy/model/strategyFormSchema.ts features/strategy/create-strategy/model/strategyFormSchema.test.ts features/strategy/create-strategy/model/useStrategyForm.ts features/strategy/create-strategy/model/useStrategyForm.test.ts
git commit -m "feat: VR 전략 폼 상태와 제출값 추가"
```

---

### Task 4: Render VR Settings In Strategy Form

**Files:**
- Create: `features/strategy/create-strategy/sections/VrSettingsSection.tsx`
- Modify: `features/strategy/create-strategy/StrategyForm.tsx`
- Modify: `features/strategy/create-strategy/StrategyForm.test.tsx`

**Interfaces:**
- Consumes:
```ts
vrFields: VrFields
setVrField(field, value)
isVr: boolean
```
- Produces: visible VR inputs only when selected strategy type is `VR`

- [ ] **Step 1: Write failing render tests**

In `features/strategy/create-strategy/StrategyForm.test.tsx`, mock the new section:
```ts
vi.mock('./sections/VrSettingsSection', () => ({
  VrSettingsSection: () => <div data-testid="vr-settings-section">vr-settings-section</div>,
}))
```

Add tests:
```ts
it('shows VR settings and hides cycle seed options for VR create mode', () => {
  useStrategyFormMock.mockReturnValue({
    ...baseFormState,
    type: 'VR',
    isVr: true,
    usesDivisionCount: false,
    vrFields: {
      initialValue: 3000,
      intervalWeeks: 4,
      bandWidth: 15,
      recurringAmount: 0,
    },
    setVrField: vi.fn(),
  })

  render(<StrategyForm accountId="account-1" />)

  expect(screen.getByTestId('vr-settings-section')).toBeInTheDocument()
  expect(screen.queryByText('cycle-seed-section')).not.toBeInTheDocument()
})

it('does not show VR settings for INFINITE create mode', () => {
  useStrategyFormMock.mockReturnValue({
    ...baseFormState,
    isVr: false,
    vrFields: {
      initialValue: null,
      intervalWeeks: 4,
      bandWidth: 15,
      recurringAmount: 0,
    },
    setVrField: vi.fn(),
  })

  render(<StrategyForm accountId="account-1" />)

  expect(screen.queryByTestId('vr-settings-section')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run RED test**

Run:
```bash
cd /Users/phs/workspace/kista/kista-ui
npm run test:run -- features/strategy/create-strategy/StrategyForm.test.tsx
```

Expected:
```text
FAIL because VrSettingsSection is not rendered
```

- [ ] **Step 3: Create `VrSettingsSection`**

Create `features/strategy/create-strategy/sections/VrSettingsSection.tsx`:
```tsx
'use client'

import { StrategyFieldLabel } from '../StrategyFieldLabel'
import type { VrFields } from '../model/useStrategyForm'

interface Props {
  fields: VrFields
  setField: (field: keyof VrFields, value: number | null) => void
  loading: boolean
  isEdit: boolean
}

function parseNumber(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function parseInteger(value: string): number | null {
  const n = parseNumber(value)
  return n === null ? null : Math.trunc(n)
}

export function VrSettingsSection({ fields, setField, loading, isEdit }: Props) {
  return (
    <div className="py-[18px] border-b border-border">
      <StrategyFieldLabel hint="VR 전략 전용">밸류 리밸런싱 설정</StrategyFieldLabel>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-sm font-bold text-muted-foreground">초기 V값</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={fields.initialValue ?? ''}
            onChange={(event) => setField('initialValue', parseNumber(event.target.value))}
            disabled={loading || isEdit}
            className="w-full h-11 rounded-[var(--r-sm)] border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-rose-400 disabled:bg-muted disabled:text-muted-foreground"
            placeholder="3000.00"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-bold text-muted-foreground">리밸런싱 주기(주)</span>
          <input
            type="number"
            min={1}
            step={1}
            value={fields.intervalWeeks ?? ''}
            onChange={(event) => setField('intervalWeeks', parseInteger(event.target.value))}
            disabled={loading || isEdit}
            className="w-full h-11 rounded-[var(--r-sm)] border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-rose-400 disabled:bg-muted disabled:text-muted-foreground"
            placeholder="4"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-bold text-muted-foreground">밴드 폭(%)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={fields.bandWidth ?? ''}
            onChange={(event) => setField('bandWidth', parseNumber(event.target.value))}
            disabled={loading || isEdit}
            className="w-full h-11 rounded-[var(--r-sm)] border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-rose-400 disabled:bg-muted disabled:text-muted-foreground"
            placeholder="15.00"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-bold text-muted-foreground">주기당 추가 예수금</span>
          <input
            type="number"
            step={1}
            value={fields.recurringAmount ?? ''}
            onChange={(event) => setField('recurringAmount', parseInteger(event.target.value))}
            disabled={loading || isEdit}
            className="w-full h-11 rounded-[var(--r-sm)] border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-rose-400 disabled:bg-muted disabled:text-muted-foreground"
            placeholder="0"
          />
        </label>
      </div>

      {isEdit && (
        <p className="text-sm text-muted-foreground mt-2 px-1">
          VR 상세 설정은 등록 후 변경할 수 없습니다.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Wire section into `StrategyForm`**

Import:
```ts
import { VrSettingsSection } from './sections/VrSettingsSection'
```

Render after `StrategyTickerSection`:
```tsx
{form.isVr && (
  <VrSettingsSection
    fields={form.vrFields}
    setField={form.setVrField}
    loading={form.loading}
    isEdit={!!initial}
  />
)}
```

Hide cycle seed for VR:
```tsx
{!form.isVr && (
  <CycleSeedSection
    autoStart={form.autoStart}
    setAutoStart={form.setAutoStart}
    seedMode={form.seedMode}
    setSeedMode={form.setSeedMode}
    loading={form.loading}
  />
)}
```

- [ ] **Step 5: Adjust read-only seed label for VR pool**

For VR create mode, keep `UsageRatioSection`, but pass a VR-specific hint:
```tsx
hint={form.isVr ? 'VR 초기 pool로 사용할 USD 예수금' : initial ? '첫 매매 전이라 시드 수정이 가능합니다' : undefined}
```

- [ ] **Step 6: Run GREEN tests**

Run:
```bash
cd /Users/phs/workspace/kista/kista-ui
npm run test:run -- features/strategy/create-strategy/StrategyForm.test.tsx
```

Expected:
```text
PASS
```

- [ ] **Step 7: Commit form UI**

Run:
```bash
cd /Users/phs/workspace/kista/kista-ui
git add features/strategy/create-strategy/StrategyForm.tsx features/strategy/create-strategy/StrategyForm.test.tsx features/strategy/create-strategy/sections/VrSettingsSection.tsx
git commit -m "feat: VR 전략 입력 섹션 추가"
```

---

### Task 5: Display VR Summary In Strategy Detail And Cards

**Files:**
- Modify: `widgets/strategy-detail/StrategyDetail.tsx`
- Modify: `widgets/strategy-detail/StrategyDetail.test.tsx`
- Modify: `widgets/strategy-card/StrategyCard.tsx`
- Modify: `widgets/strategy-card/StrategyCard.test.tsx`

**Interfaces:**
- Consumes: `Strategy.vr?: StrategyVrSummary`
- Produces: VR cards showing `V값`, `밴드 폭`, `pool 상한`, `G`, and no false `매매표` label

- [ ] **Step 1: Write failing detail tests**

Append to `widgets/strategy-detail/StrategyDetail.test.tsx`:
```ts
it('shows VR summary instead of privacy operating mode copy', () => {
  render(<StrategyDetail
    accountId="account-1"
    accountNoMasked="123-45"
    strategy={{
      ...baseStrategy,
      type: 'VR',
      ticker: 'TQQQ',
      divisionCount: undefined,
      initialUsdDeposit: 2000,
      vr: {
        value: 3000,
        bandWidth: 15,
        intervalWeeks: 4,
        recurringAmount: -100,
        poolLimit: 500,
        gradient: 20,
      },
    }}
  />)

  expect(screen.getByTestId('strategy-summary-grid')).toHaveTextContent('VR')
  expect(screen.getByText('V값')).toBeInTheDocument()
  expect(screen.getByText('$3,000.00')).toBeInTheDocument()
  expect(screen.getByText('밴드 폭')).toBeInTheDocument()
  expect(screen.getByText('15%')).toBeInTheDocument()
  expect(screen.queryByText('매매표')).not.toBeInTheDocument()
})
```

Adjust the `useMeta` mock:
```ts
findStrategyType: (code: string) => {
  if (code === 'INFINITE') return { divisionCounts: [20, 30, 40] }
  return { divisionCounts: [] }
},
```

- [ ] **Step 2: Write failing card test**

Append to `widgets/strategy-card/StrategyCard.test.tsx`:
```ts
it('shows VR marker without rendering division count', () => {
  render(<StrategyCard
    accountId="account-1"
    strategy={{
      ...strategy,
      type: 'VR',
      ticker: 'TQQQ',
      divisionCount: undefined,
      currentRound: undefined,
      vr: {
        value: 3000,
        bandWidth: 15,
        intervalWeeks: 4,
        recurringAmount: 0,
        poolLimit: 1000,
        gradient: 10,
      },
    }}
  />)

  expect(screen.getByText('VR')).toBeInTheDocument()
  expect(screen.getAllByText('V $3,000.00')[0]).toBeInTheDocument()
  expect(screen.queryByText('undefined분할')).not.toBeInTheDocument()
})
```

- [ ] **Step 3: Run RED tests**

Run:
```bash
cd /Users/phs/workspace/kista/kista-ui
npm run test:run -- widgets/strategy-detail/StrategyDetail.test.tsx widgets/strategy-card/StrategyCard.test.tsx
```

Expected:
```text
FAIL because VR summary UI is not implemented
```

- [ ] **Step 4: Add VR summary branch in StrategyDetail**

Near existing summary derivations:
```ts
const isVr = strategy.type === 'VR' || strategy.vr != null
```

Replace the first summary KPI value logic:
```tsx
<KpiCard
  label={usesDivisionCount ? '분할' : isVr ? '운용 방식' : '운용 방식'}
  value={<span className="inline-flex items-center text-xl lg:text-2xl font-bold">{usesDivisionCount ? `${strategy.divisionCount}분할` : isVr ? 'VR' : '매매표'}</span>}
  className="p-4 lg:p-5"
  valueClassName="text-xl lg:text-2xl"
/>
```

Render VR KPI grid before the `usesDivisionCount` preview KPI branch:
```tsx
{strategy.vr && (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    <KpiCard label="V값" value={`$${fmtUsd(strategy.vr.value)}`} />
    <KpiCard label="밴드 폭" value={`${strategy.vr.bandWidth}%`} />
    <KpiCard label="pool 상한" value={`$${fmtUsd(strategy.vr.poolLimit)}`} />
    <KpiCard label="G" value={`${strategy.vr.gradient}`} />
  </div>
)}
```

Keep the existing `usesDivisionCount` position grid conditional unchanged so VR does not render INFINITE-only preview KPIs.

- [ ] **Step 5: Add VR marker in StrategyCard**

Near existing derived values:
```ts
const isVr = strategy.type === 'VR' || strategy.vr != null
```

In mobile main row, after division badge block:
```tsx
{isVr && strategy.vr && (
  <Badge tone="neutral" size="sm" className="text-foreground">
    V ${fmtUsd(strategy.vr.value)}
  </Badge>
)}
```

In desktop badge row, after division badge block:
```tsx
{isVr && strategy.vr && (
  <Badge tone="neutral" size="sm" className="h-[22px] text-foreground">
    V ${fmtUsd(strategy.vr.value)}
  </Badge>
)}
```

- [ ] **Step 6: Run GREEN tests**

Run:
```bash
cd /Users/phs/workspace/kista/kista-ui
npm run test:run -- widgets/strategy-detail/StrategyDetail.test.tsx widgets/strategy-card/StrategyCard.test.tsx
```

Expected:
```text
PASS
```

- [ ] **Step 7: Commit display work**

Run:
```bash
cd /Users/phs/workspace/kista/kista-ui
git add widgets/strategy-detail/StrategyDetail.tsx widgets/strategy-detail/StrategyDetail.test.tsx widgets/strategy-card/StrategyCard.tsx widgets/strategy-card/StrategyCard.test.tsx
git commit -m "feat: VR 전략 요약 표시 추가"
```

---

### Task 6: Documentation, Full Verification, And Final Commit Hygiene

**Files:**
- Modify: `docs/agents/entities.md`
- Modify: `docs/agents/features.md`
- Modify: `docs/agents/widgets.md`
- Inspect: `git diff`

**Interfaces:**
- Consumes: all prior task changes
- Produces: documented VR frontend behavior and verified branch

- [ ] **Step 1: Update entities docs**

In `docs/agents/entities.md`, update the strategy DTO notes:
```md
- `TradingCycleResponse`: `{ id, accountId, type, status, ticker, cycleSeedType, initialUsdDeposit, divisionCount, isReverseMode, currentRound, currentHoldings, vr }`
- `vr`: VR 전략 전용 요약 `{ value, bandWidth, intervalWeeks, recurringAmount, poolLimit, gradient }`; 비VR은 없음
- `divisionCount`: INFINITE 전략 전용. VR/PRIVACY는 `undefined`로 정규화한다
- `StrategyRequest`: VR 등록 시 `initialValue`, `intervalWeeks`, `bandWidth`, `recurringAmount`를 포함한다
```

- [ ] **Step 2: Update features docs**

In `docs/agents/features.md`, update create-strategy notes:
```md
- **`strategy/create-strategy`**: VR 등록은 기존 seed 입력을 초기 pool(`initialUsdDeposit`)로 사용하고, `VrSettingsSection`에서 `initialValue`, `intervalWeeks`, `bandWidth`, `recurringAmount`를 입력한다. VR은 백엔드가 `cycleSeedType=NONE`, `ticker=TQQQ`로 강제하므로 사이클 연속 UI를 숨긴다.
```

- [ ] **Step 3: Update widgets docs**

In `docs/agents/widgets.md`, update strategy-detail/card notes:
```md
- **`strategy-detail`**: `divisionCounts.length === 0`을 PRIVACY로 단정하지 않는다. VR은 `strategy.vr` 존재 여부로 V값, 밴드 폭, pool 상한, G를 표시한다.
- **`strategy-card`**: VR은 분할 배지 대신 compact `V $3,000.00` 형식의 배지를 표시한다.
```

- [ ] **Step 4: Run focused tests**

Run:
```bash
cd /Users/phs/workspace/kista/kista-ui
npm run test:run -- \
  entities/strategy/api/index.test.ts \
  features/strategy/create-strategy/model/strategyFormSchema.test.ts \
  features/strategy/create-strategy/model/useStrategyForm.test.ts \
  features/strategy/create-strategy/StrategyForm.test.tsx \
  widgets/strategy-detail/StrategyDetail.test.tsx \
  widgets/strategy-card/StrategyCard.test.tsx
```

Expected:
```text
PASS
```

- [ ] **Step 5: Run typecheck**

Run:
```bash
cd /Users/phs/workspace/kista/kista-ui
npm run typecheck
```

Expected:
```text
No TypeScript errors
```

- [ ] **Step 6: Check branch and diff**

Run:
```bash
cd /Users/phs/workspace/kista/kista-ui
git status --short
git log --oneline --decorate -5
git diff --stat main...HEAD
```

Expected:
```text
Only VR UI implementation files and docs are changed on the VR branch.
```

- [ ] **Step 7: Commit docs and any remaining verified changes**

If docs are the only uncommitted files:
```bash
cd /Users/phs/workspace/kista/kista-ui
git add docs/agents/entities.md docs/agents/features.md docs/agents/widgets.md
git commit -m "docs: VR 전략 UI 동작 문서화"
```

If implementation files remain uncommitted because tasks were batched:
```bash
cd /Users/phs/workspace/kista/kista-ui
git add openapi.json shared/lib/api-types.ts shared/lib/api-schema.ts entities/strategy features/strategy widgets/strategy-detail widgets/strategy-card docs/agents/entities.md docs/agents/features.md docs/agents/widgets.md
git commit -m "feat: VR 전략 UI 대응"
```

---

## Known Risks And Follow-Up Candidates

- `openapi.json` in `kista-ui` is currently stale compared with `kista-api`; Task 1 must run against the latest local API before implementation starts.
- Existing UI often treats `divisionCounts.length === 0` as a generic non-division strategy. That was acceptable for PRIVACY only, but VR makes it a real product bug. Task 5 fixes the visible strategy card/detail cases; future audits should search `divisionCounts` and ensure no remaining code maps non-division directly to `매매표`.
- VR update support is backend-limited: `TradingCycleRequest.toUpdateCommand()` currently only maps `cycleSeedType` and `initialUsdDeposit`. The UI should render VR settings as read-only in edit mode until backend explicitly supports VR config updates.
- VR seed preview returns no minimum seed by design because backend `VrCycleOrderStrategy.minRequiredDeposit()` returns `null`. The form must not block VR submit just because `basePrice` and `minSeed` are absent.
- VR uses live holdings at registration to create the initial VR position. A complete manual QA pass should register VR on an account with and without TQQQ holdings to verify order preview behavior.
