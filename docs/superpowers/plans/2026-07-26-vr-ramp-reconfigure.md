# VR 램프 + 운영 중 재설정 UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** kista-api의 VR 램프(gradient·poolLimitRate 경과주수 램프) + 운영 중 재설정(`PUT /api/trading-cycles/{id}/vr-config`) 기능을 kista-ui에 반영한다.

**Architecture:** `entities/strategy`에 타입·정규화·API 함수·뮤테이션 훅을 추가하고(전제 레이어), 등록 폼(`features/strategy/create-strategy`)에 램프 8필드 고급설정을 얹고, 완전히 새로운 feature 슬라이스(`features/strategy/reconfigure-vr`)로 운영 중 재설정 전용 폼(경고 배너 + 확인 다이얼로그)을 만들어 기존 `strategies/[sid]/edit`와 동일한 인터셉팅 라우트 모달 패턴으로 노출한다.

**Tech Stack:** Next.js 16 App Router, TypeScript, react-hook-form + zod, TanStack React Query, Tailwind CSS + shadcn/ui, Vitest + Testing Library.

## Global Constraints

- 싱글 쿼트, 세미콜론 없음, import 중괄호 공백 유지 — 기존 파일 포맷 일괄 변경 금지.
- `any` 금지. 서버 상태는 React Query가 SSOT — `useState`로 복사하지 않는다.
- FSD 의존성 단방향(`app -> widgets -> features -> entities -> shared`), 동일 계층(feature-feature, entity-entity) cross-import 금지.
- `entities/strategy`의 `StrategyVrSummary`/`StrategyRequest` 필드 추가 시 `model/types.ts` + `api/index.ts`의 `normalizeVrSummary()`를 항상 함께 수정한다.
- `gradient`/`poolLimit`(현재 스냅샷)과 `initialGradient`/`initialPoolLimitRate`(램프 0주차 값)는 다른 값이다 — 재설정 폼·등록 폼 고급설정 모두 후자를 사용한다.
- 뮤테이션 훅은 성공 시 `toast.success` + `queryClient.invalidateQueries`, 실패 시 `toast.error(apiMsg(err, fallback))` 캡슐화 필수.
- 각 작업 단위(Task) 종료 시 커밋. author는 `narafu <narafu@kakao.com>`, 커밋 메시지는 한글.
- 기본 검증 명령은 `npm run typecheck`(현재 `lint`는 신뢰 불가). 매 Task 후 관련 테스트 파일을 `npx vitest run <path>`로 실행한다.

---

## Task 1: entities/strategy — 타입 + normalizeVrSummary 8필드 확장

**Files:**
- Modify: `entities/strategy/model/types.ts`
- Modify: `entities/strategy/api/index.ts`
- Test: `entities/strategy/api/index.test.ts`

**Interfaces:**
- Produces: `StrategyVrSummary`에 `initialGradient: number, gGraceWeeks: number, gStepWeeks: number, gMax: number, initialPoolLimitRate: number, pGraceWeeks: number, pStepWeeks: number, poolLimitFloor: number` 8필드 추가. `StrategyRequest`에 동일 이름의 8개 optional 필드 추가. 신규 `ReconfigureVrRequest` 타입(아래 Task 2에서 실제 사용).

- [ ] **Step 1: 기존 정규화 테스트를 8필드 포함하도록 확장 (실패 예상)**

`entities/strategy/api/index.test.ts`의 기존 테스트를 아래로 교체한다(입력 fixture와 기대값 양쪽에 8필드 추가):

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
  it('normalizes VR summary numbers including ramp fields, and preserves null divisionCount as undefined-like UI data', async () => {
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
        startDate: '2026-08-01',
        vr: {
          value: '3000.00',
          bandWidth: '15.00',
          intervalWeeks: 4,
          recurringAmount: 0,
          poolLimit: '1000.00',
          gradient: 18,
          initialGradient: 10,
          gGraceWeeks: 52,
          gStepWeeks: 26,
          gMax: 20,
          initialPoolLimitRate: '0.75',
          pGraceWeeks: 52,
          pStepWeeks: 26,
          poolLimitFloor: '0.50',
        },
      },
    ])

    const result = await listStrategies('account-1')

    expect(result[0]).toEqual(expect.objectContaining({
      type: 'VR',
      ticker: 'TQQQ',
      divisionCount: undefined,
      currentHoldings: 4,
      startDate: '2026-08-01',
      vr: {
        value: 3000,
        bandWidth: 15,
        intervalWeeks: 4,
        recurringAmount: 0,
        poolLimit: 1000,
        gradient: 18,
        initialGradient: 10,
        gGraceWeeks: 52,
        gStepWeeks: 26,
        gMax: 20,
        initialPoolLimitRate: 0.75,
        pGraceWeeks: 52,
        pStepWeeks: 26,
        poolLimitFloor: 0.5,
      },
    }))
  })
})
```

`gradient: 18` vs `initialGradient: 10`을 의도적으로 다르게 둔다 — 정규화가 두 필드를 혼동하지 않는지 이 테스트만으로도 드러난다.

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `npx vitest run entities/strategy/api/index.test.ts`
Expected: FAIL — `result[0].vr`에 `initialGradient` 등 8필드가 `undefined`라 `toEqual` 불일치.

- [ ] **Step 3: `model/types.ts`에 8필드 추가**

`entities/strategy/model/types.ts`의 `StrategyVrSummary`를 아래로 교체:

```ts
export interface StrategyVrSummary {
  value: number          // 기준 V값
  bandWidth: number      // 밴드 폭 (%)
  intervalWeeks: number  // 롤오버 주기 (주)
  recurringAmount: number // 정기 입출금 (USD, 양수=입금 / 0=거치 / 음수=인출)
  poolLimit: number      // pool 한도 (현재 사이클 스냅샷 — 램프 0주차 값은 initialPoolLimitRate)
  gradient: number       // 조정 계수 G (현재 사이클 스냅샷 — 램프 0주차 값은 initialGradient)
  initialGradient: number       // 램프 시작(경과 0주) G값
  gGraceWeeks: number            // G 램프 시작 전 유예 주수
  gStepWeeks: number             // G가 1단계 오르는 주기(주)
  gMax: number                    // G 상한
  initialPoolLimitRate: number  // 램프 시작(경과 0주) poolLimitRate(0~1 비율)
  pGraceWeeks: number             // poolLimitRate 램프 시작 전 유예 주수
  pStepWeeks: number              // poolLimitRate가 5%p 내려가는 주기(주)
  poolLimitFloor: number          // poolLimitRate 하한(0~1)
}
```

`StrategyRequest`에 `recurringAmount?: number` 다음 줄에 8개 optional 필드 추가(`scheduledStartDate?` 앞):

```ts
export interface StrategyRequest {
  type: string
  ticker?: string
  cycleSeedType: CycleSeedType
  initialUsdDeposit?: number
  divisionCount?: number
  initialHoldings?: number
  initialAvgPrice?: number
  intervalWeeks?: number
  bandWidth?: number
  recurringAmount?: number
  initialGradient?: number
  gGraceWeeks?: number
  gStepWeeks?: number
  gMax?: number
  initialPoolLimitRate?: number
  pGraceWeeks?: number
  pStepWeeks?: number
  poolLimitFloor?: number
  scheduledStartDate?: string
}
```

파일 끝(`StrategySeedPreview` 다음)에 신규 타입 추가:

```ts
// VR 전략 운영 중 재설정 — PUT /api/trading-cycles/{id}/vr-config 요청 바디, 14필드 전부 optional
export interface ReconfigureVrRequest {
  bandWidth?: number
  intervalWeeks?: number
  recurringAmount?: number
  initialGradient?: number
  gGraceWeeks?: number
  gStepWeeks?: number
  gMax?: number
  initialPoolLimitRate?: number
  pGraceWeeks?: number
  pStepWeeks?: number
  poolLimitFloor?: number
  injectShares?: number
  injectSharePrice?: number
  injectDeposit?: number
}
```

- [ ] **Step 4: `api/index.ts`의 `normalizeVrSummary()` 확장**

`entities/strategy/api/index.ts` 상단 import를 교체:

```ts
import { clientFetch, fetchEither, jsonBody } from '@shared/lib/api-client'
import { toNum } from '@shared/lib/utils'
import type { CycleSeedType, ReconfigureVrRequest, Strategy, StrategyRequest, StrategySeedPreview, StrategyVrSummary } from '../model/types'
import type { PlacedOrder } from '@shared/model/placed-order'
```

`normalizeVrSummary` 함수를 아래로 교체:

```ts
function normalizeVrSummary(raw: unknown): StrategyVrSummary | undefined {
  if (raw == null) return undefined
  const v = raw as Record<string, unknown>
  return {
    value: toNum(v.value),
    bandWidth: toNum(v.bandWidth),
    intervalWeeks: Number(v.intervalWeeks),
    recurringAmount: Number(v.recurringAmount ?? 0),
    poolLimit: toNum(v.poolLimit),
    gradient: Number(v.gradient),
    initialGradient: Number(v.initialGradient),
    gGraceWeeks: Number(v.gGraceWeeks),
    gStepWeeks: Number(v.gStepWeeks),
    gMax: Number(v.gMax),
    initialPoolLimitRate: toNum(v.initialPoolLimitRate),
    pGraceWeeks: Number(v.pGraceWeeks),
    pStepWeeks: Number(v.pStepWeeks),
    poolLimitFloor: toNum(v.poolLimitFloor),
  }
}
```

(`ReconfigureVrRequest` import는 Task 2에서 사용 — 이 시점엔 미사용 경고가 날 수 있으니 Task 2와 이어서 진행한다.)

- [ ] **Step 5: 테스트 실행 → 통과 확인**

Run: `npx vitest run entities/strategy/api/index.test.ts`
Expected: PASS

- [ ] **Step 6: 타입체크**

Run: `npm run typecheck`
Expected: `ReconfigureVrRequest`가 아직 어디서도 값으로 쓰이지 않아 미사용 import 에러가 날 수 있음 — 나면 Step 4의 import를 Task 2에서 마저 쓰도록 이 커밋에 Task 2도 이어 붙인다(아래 Task 2 Step 1로 계속 진행 후 한 번에 커밋).

---

## Task 2: entities/strategy — `reconfigureVr()` API 함수 + export

**Files:**
- Modify: `entities/strategy/api/index.ts`
- Modify: `entities/strategy/index.ts`
- Test: `entities/strategy/api/index.test.ts`

**Interfaces:**
- Consumes: Task 1의 `ReconfigureVrRequest`, `normalizeStrategy`(기존 함수, `entities/strategy/api/index.ts`에 이미 존재)
- Produces: `reconfigureVr(id: string, data: ReconfigureVrRequest, token?: string): Promise<Strategy>`

- [ ] **Step 1: 실패하는 테스트 추가**

`entities/strategy/api/index.test.ts`에 아래 `describe` 블록을 추가:

```ts
describe('reconfigureVr', () => {
  it('PUT /api/trading-cycles/{id}/vr-config 로 요청하고 응답을 정규화한다', async () => {
    const { reconfigureVr } = await import('./index')
    fetchEitherMock.mockResolvedValueOnce({
      id: 'strategy-1',
      accountId: 'account-1',
      type: 'VR',
      status: 'ACTIVE',
      ticker: 'TQQQ',
      cycleSeedType: 'NONE',
      isReverseMode: false,
      startDate: '2026-08-01',
      vr: {
        value: '3200.00',
        bandWidth: '20.00',
        intervalWeeks: 4,
        recurringAmount: 0,
        poolLimit: '1200.00',
        gradient: 10,
        initialGradient: 10,
        gGraceWeeks: 52,
        gStepWeeks: 26,
        gMax: 20,
        initialPoolLimitRate: '0.75',
        pGraceWeeks: 52,
        pStepWeeks: 26,
        poolLimitFloor: '0.50',
      },
    })

    const result = await reconfigureVr('strategy-1', { bandWidth: 20 })

    expect(fetchEitherMock).toHaveBeenCalledWith(
      '/api/trading-cycles/strategy-1/vr-config',
      { method: 'PUT', body: JSON.stringify({ bandWidth: 20 }) },
      undefined,
    )
    expect(result.vr?.bandWidth).toBe(20)
    expect(result.startDate).toBe('2026-08-01')
  })
})
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run entities/strategy/api/index.test.ts`
Expected: FAIL — `reconfigureVr` export가 없어 `undefined is not a function`.

- [ ] **Step 3: 함수 구현**

`entities/strategy/api/index.ts`의 `updateStrategy` 함수 바로 아래에 추가:

```ts
export async function reconfigureVr(id: string, data: ReconfigureVrRequest, token?: string): Promise<Strategy> {
  const raw = await fetchEither<unknown>(`/api/trading-cycles/${id}/vr-config`, jsonBody('PUT', data), token)
  return normalizeStrategy(raw)
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run entities/strategy/api/index.test.ts`
Expected: PASS (Task 1의 테스트도 함께 PASS)

- [ ] **Step 5: `entities/strategy/index.ts`에 export 추가**

`export { ... } from './api'` 블록에 `reconfigureVr` 추가:

```ts
export {
  listAllStrategies,
  listStrategies,
  createStrategy,
  updateStrategy,
  deleteStrategy,
  pauseStrategy,
  resumeStrategy,
  executeStrategy,
  getStrategySeedPreview,
  reconfigureVr,
} from './api'
```

최상단 타입 re-export 줄에 `ReconfigureVrRequest` 추가:

```ts
export type { CycleSeedType, Strategy, StrategyRequest, ReconfigureVrRequest, StrategySeedPreview } from './model/types'
```

- [ ] **Step 6: 전체 타입체크 + 관련 테스트**

Run: `npm run typecheck && npx vitest run entities/strategy`
Expected: 둘 다 PASS

- [ ] **Step 7: 커밋**

```bash
git add entities/strategy/model/types.ts entities/strategy/api/index.ts entities/strategy/api/index.test.ts entities/strategy/index.ts
git commit -m "$(cat <<'EOF'
feat(strategy): VR 램프 8필드 타입 + reconfigureVr API 함수 추가

kista-api VR 램프·운영 중 재설정 기능을 위한 entities 레이어 전제 작업.
StrategyVrSummary/StrategyRequest에 램프 8필드를 추가하고,
PUT /api/trading-cycles/{id}/vr-config를 호출하는 reconfigureVr()을 추가한다.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: entities/strategy — `useReconfigureVrMutation` 훅

**Files:**
- Modify: `entities/strategy/hooks/useStrategyQueries.ts`
- Modify: `entities/strategy/index.ts`
- Test: `entities/strategy/hooks/useStrategyQueries.test.tsx`

**Interfaces:**
- Consumes: Task 2의 `reconfigureVr(id, data, token?)`, Task 1의 `ReconfigureVrRequest`
- Produces: `useReconfigureVrMutation(strategyId: string, onSuccess?: () => void)` — React Query `useMutation` 반환값(`mutate`, `isPending` 등)

- [ ] **Step 1: 실패하는 테스트 추가**

`entities/strategy/hooks/useStrategyQueries.test.tsx` 상단 import를 교체:

```tsx
import { useAllStrategiesQuery, useStrategiesQuery, useUpdateStrategyMutation, useReconfigureVrMutation, useExecuteStrategyMutation } from './useStrategyQueries'
```

`vi.mock('../api', ...)` 블록에 `reconfigureVr: vi.fn()` 추가:

```tsx
vi.mock('../api', () => ({
  listAllStrategies: vi.fn(),
  listStrategies: vi.fn(),
  createStrategy: vi.fn(),
  updateStrategy: vi.fn(),
  reconfigureVr: vi.fn(),
  deleteStrategy: vi.fn(),
  pauseStrategy: vi.fn(),
  resumeStrategy: vi.fn(),
  executeStrategy: vi.fn(),
  getStrategySeedPreview: vi.fn(),
}))
```

`useUpdateStrategyMutation` describe 블록 뒤에 추가:

```tsx
describe('useReconfigureVrMutation', () => {
  it('재설정 성공 시 strategies와 order-preview 쿼리를 모두 무효화한다', () => {
    const invalidateQueries = vi.fn()
    vi.mocked(useQueryClient).mockReturnValue({ invalidateQueries } as never)
    vi.mocked(useMutation).mockReturnValue({} as never)

    renderHook(() => useReconfigureVrMutation('strategy-1'))

    const options = vi.mocked(useMutation).mock.calls.at(-1)?.[0] as unknown as { onSuccess: () => void }
    options.onSuccess()

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['strategies'] })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['order-preview'] })
  })
})
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run entities/strategy/hooks/useStrategyQueries.test.tsx`
Expected: FAIL — `useReconfigureVrMutation` export 없음.

- [ ] **Step 3: 훅 구현**

`entities/strategy/hooks/useStrategyQueries.ts` 상단 import 확장:

```ts
import {
  listAllStrategies,
  listStrategies,
  createStrategy,
  updateStrategy,
  reconfigureVr,
  deleteStrategy,
  pauseStrategy,
  resumeStrategy,
  executeStrategy,
  getStrategySeedPreview,
} from '../api'
import type { ReconfigureVrRequest, Strategy, StrategyRequest, StrategySeedPreview } from '../model/types'
```

`useUpdateStrategyMutation` 함수 바로 아래에 추가:

```ts
export function useReconfigureVrMutation(strategyId: string, onSuccess?: () => void) {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: ReconfigureVrRequest) => reconfigureVr(strategyId, data),
    onSuccess: () => {
      toast.success('VR 전략이 재설정되었습니다')
      queryClient.invalidateQueries({ queryKey: ['strategies'] })
      // 사이클이 통째로 교체되므로 다음 주문 미리보기도 반드시 무효화
      queryClient.invalidateQueries({ queryKey: ['order-preview'] })
      router.refresh()
      onSuccess?.()
    },
    onError: (err) => toast.error(apiMsg(err, '재설정에 실패했습니다')),
  })
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run entities/strategy/hooks/useStrategyQueries.test.tsx`
Expected: PASS

- [ ] **Step 5: `entities/strategy/index.ts`에 훅 export 추가**

```ts
export {
  useStrategySeedPreviewQuery,
  useAllStrategiesQuery,
  useStrategiesQuery,
  useCreateStrategyMutation,
  useUpdateStrategyMutation,
  useReconfigureVrMutation,
  useDeleteStrategyMutation,
  usePauseStrategyMutation,
  useResumeStrategyMutation,
  useExecuteStrategyMutation,
} from './hooks/useStrategyQueries'
```

- [ ] **Step 6: 전체 검증**

Run: `npm run typecheck && npx vitest run entities/strategy`
Expected: 둘 다 PASS

- [ ] **Step 7: 커밋**

```bash
git add entities/strategy/hooks/useStrategyQueries.ts entities/strategy/hooks/useStrategyQueries.test.tsx entities/strategy/index.ts
git commit -m "$(cat <<'EOF'
feat(strategy): useReconfigureVrMutation 훅 추가

VR 운영 중 재설정 뮤테이션 — 성공 시 strategies·order-preview 쿼리를
모두 무효화한다(사이클이 통째로 교체되므로 다음 주문 미리보기도 갱신 필요).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

이로써 A(entities 레이어)가 완료된다.

---

## Task 4: create-strategy — `strategyFormSchema.ts` 램프 8필드 검증 추가

**Files:**
- Modify: `features/strategy/create-strategy/model/strategyFormSchema.ts`
- Test: `features/strategy/create-strategy/model/strategyFormSchema.test.ts`

**Interfaces:**
- Produces: `StrategyFormValues`에 8개 optional 숫자 필드 추가(`initialGradient`, `gGraceWeeks`, `gStepWeeks`, `gMax`, `initialPoolLimitRate`, `pGraceWeeks`, `pStepWeeks`, `poolLimitFloor`)

- [ ] **Step 1: 실패하는 테스트 추가**

`features/strategy/create-strategy/model/strategyFormSchema.test.ts` 끝에 추가:

```ts
  it('VR 램프 8필드가 유효한 범위면 파싱 성공', () => {
    const result = strategyFormSchema.safeParse({
      type: 'VR',
      ticker: 'TQQQ',
      autoStart: false,
      seedMode: 'KEEP',
      divisionCount: 20,
      recurringMode: 'HOLD',
      initialGradient: 10,
      gGraceWeeks: 52,
      gStepWeeks: 26,
      gMax: 20,
      initialPoolLimitRate: 0.75,
      pGraceWeeks: 52,
      pStepWeeks: 26,
      poolLimitFloor: 0.5,
    })

    expect(result.success).toBe(true)
  })

  it('램프 8필드를 생략해도 파싱 성공 (전부 optional)', () => {
    const result = strategyFormSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it('initialGradient가 0 이하면 실패', () => {
    const result = strategyFormSchema.safeParse({ ...valid, type: 'VR', ticker: 'TQQQ', initialGradient: 0 })
    expect(result.success).toBe(false)
  })

  it('gGraceWeeks가 음수면 실패', () => {
    const result = strategyFormSchema.safeParse({ ...valid, type: 'VR', ticker: 'TQQQ', gGraceWeeks: -1 })
    expect(result.success).toBe(false)
  })

  it('initialPoolLimitRate가 1을 초과하면 실패', () => {
    const result = strategyFormSchema.safeParse({ ...valid, type: 'VR', ticker: 'TQQQ', initialPoolLimitRate: 1.5 })
    expect(result.success).toBe(false)
  })

  it('poolLimitFloor가 0이면 실패 (0 초과 필요)', () => {
    const result = strategyFormSchema.safeParse({ ...valid, type: 'VR', ticker: 'TQQQ', poolLimitFloor: 0 })
    expect(result.success).toBe(false)
  })

  it('gStepWeeks·pStepWeeks가 소수이면 실패 (정수 제약)', () => {
    expect(strategyFormSchema.safeParse({ ...valid, type: 'VR', ticker: 'TQQQ', gStepWeeks: 26.5 }).success).toBe(false)
    expect(strategyFormSchema.safeParse({ ...valid, type: 'VR', ticker: 'TQQQ', pStepWeeks: 26.5 }).success).toBe(false)
  })
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run features/strategy/create-strategy/model/strategyFormSchema.test.ts`
Expected: FAIL — 스키마가 8필드를 모르므로 `strict` 모드가 아니라도 `initialGradient: 0` 등은 통과해버려 "실패해야 할 케이스가 성공"으로 어긋난다.

- [ ] **Step 3: 스키마에 8필드 추가**

`features/strategy/create-strategy/model/strategyFormSchema.ts`의 `strategyFormSchema`를 아래로 교체:

```ts
export const strategyFormSchema = z.object({
  type: z.string().min(1, '전략 타입을 선택하세요'),
  ticker: z.string().min(1, '종목을 선택하세요'),
  autoStart: z.boolean(),
  seedMode: z.enum(['KEEP', 'MAX']),
  divisionCount: divisionCountSchema,
  avgPrice: z.number().min(0).nullable().optional(),
  quantity: z.number().int().min(0).nullable().optional(),
  intervalWeeks: z.number().int().min(1).nullable().optional(),
  bandWidth: z.number().positive().nullable().optional(),
  recurringAmount: z.number().int().nonnegative().nullable().optional(),
  recurringMode: z.enum(['DEPOSIT', 'HOLD', 'WITHDRAW']),
  scheduledStartDate: z.string().nullable().optional(),
  // VR 램프 파라미터 — 전부 optional, 생략 시 백엔드 기본값 적용
  initialGradient: z.number().int().positive().nullable().optional(),
  gGraceWeeks: z.number().int().nonnegative().nullable().optional(),
  gStepWeeks: z.number().int().positive().nullable().optional(),
  gMax: z.number().int().positive().nullable().optional(),
  initialPoolLimitRate: z.number().positive().max(1).nullable().optional(),
  pGraceWeeks: z.number().int().nonnegative().nullable().optional(),
  pStepWeeks: z.number().int().positive().nullable().optional(),
  poolLimitFloor: z.number().positive().max(1).nullable().optional(),
})
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run features/strategy/create-strategy/model/strategyFormSchema.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add features/strategy/create-strategy/model/strategyFormSchema.ts features/strategy/create-strategy/model/strategyFormSchema.test.ts
git commit -m "$(cat <<'EOF'
feat(strategy): 전략 등록 폼 스키마에 VR 램프 8필드 검증 추가

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: create-strategy — `useStrategyForm.ts` VrFields 확장 + payload 조립

**Files:**
- Modify: `features/strategy/create-strategy/model/useStrategyForm.ts`
- Test: `features/strategy/create-strategy/model/useStrategyForm.test.ts`

**Interfaces:**
- Consumes: Task 4의 `strategyFormSchema`(8필드 포함)
- Produces: `VrFields`에 8필드 추가(전부 `number | null`, `setVrField(field, value)`가 그대로 커버). Create payload(`StrategyRequest`)에 값이 있을 때만 8필드 포함.

- [ ] **Step 1: 실패하는 테스트 추가**

`features/strategy/create-strategy/model/useStrategyForm.test.ts`의 `'VR create payload includes VR fields and forces cycleSeedType NONE'` 테스트 바로 아래에 새 테스트 2개를 추가:

```ts
  it('VR create payload includes ramp fields when provided', async () => {
    seedModelState.seedUsd = 2000

    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setType('VR')
      result.current.setVrField('avgPrice', 300)
      result.current.setVrField('quantity', 10)
      result.current.setVrField('intervalWeeks', 4)
      result.current.setVrField('bandWidth', 15)
      result.current.setVrField('recurringAmount', null)
      result.current.setVrField('initialGradient', 10)
      result.current.setVrField('gGraceWeeks', 52)
      result.current.setVrField('gStepWeeks', 26)
      result.current.setVrField('gMax', 20)
      result.current.setVrField('initialPoolLimitRate', 0.75)
      result.current.setVrField('pGraceWeeks', 52)
      result.current.setVrField('pStepWeeks', 26)
      result.current.setVrField('poolLimitFloor', 0.5)
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
      initialHoldings: 10,
      initialAvgPrice: 300,
      intervalWeeks: 4,
      bandWidth: 15,
      recurringAmount: 0,
      initialGradient: 10,
      gGraceWeeks: 52,
      gStepWeeks: 26,
      gMax: 20,
      initialPoolLimitRate: 0.75,
      pGraceWeeks: 52,
      pStepWeeks: 26,
      poolLimitFloor: 0.5,
    })
  })

  it('VR create is blocked when gMax is below initialGradient', () => {
    seedModelState.seedUsd = 2000

    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setType('VR')
      result.current.setVrField('intervalWeeks', 4)
      result.current.setVrField('bandWidth', 15)
      result.current.setVrField('initialGradient', 10)
      result.current.setVrField('gMax', 5)
    })

    expect(result.current.cannotSubmit).toBe(true)
    expect(result.current.submitDisabledReason).toBe('gradient 상한은 초기값 이상이어야 합니다.')
  })
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run features/strategy/create-strategy/model/useStrategyForm.test.ts`
Expected: FAIL — `setVrField('initialGradient', ...)`는 타입 에러(아직 `VrFields`에 없음), payload에도 8필드가 없음.

- [ ] **Step 3: `VrFields` 인터페이스 확장**

`features/strategy/create-strategy/model/useStrategyForm.ts`의 `VrFields`를 아래로 교체:

```ts
// VR 전략 전용 폼 필드 (avgPrice·quantity는 "중간부터 시작" 공통 필드 — VR 외 전략도 사용)
export interface VrFields {
  avgPrice: number | null
  quantity: number | null
  intervalWeeks: number | null
  bandWidth: number | null
  recurringAmount: number | null
  initialGradient: number | null
  gGraceWeeks: number | null
  gStepWeeks: number | null
  gMax: number | null
  initialPoolLimitRate: number | null
  pGraceWeeks: number | null
  pStepWeeks: number | null
  poolLimitFloor: number | null
}
```

- [ ] **Step 4: `defaultValues`에 8필드 추가**

`useForm<StrategyFormValues>` 호출의 `defaultValues` 객체에서 `recurringMode: ...` 다음, `scheduledStartDate: null,` 앞에 추가:

```ts
      initialGradient: initial?.vr?.initialGradient ?? null,
      gGraceWeeks: initial?.vr?.gGraceWeeks ?? null,
      gStepWeeks: initial?.vr?.gStepWeeks ?? null,
      gMax: initial?.vr?.gMax ?? null,
      initialPoolLimitRate: initial?.vr?.initialPoolLimitRate ?? null,
      pGraceWeeks: initial?.vr?.pGraceWeeks ?? null,
      pStepWeeks: initial?.vr?.pStepWeeks ?? null,
      poolLimitFloor: initial?.vr?.poolLimitFloor ?? null,
```

(수정 모드에선 고급설정 섹션 자체를 렌더하지 않으므로(Task 6) 실제로는 항상 `null`로 남지만, 편집 모드 초기화도 일관되게 채워둔다.)

- [ ] **Step 5: `watch` + `vrFields` 조립부 확장**

`const scheduledStartDate = form.watch('scheduledStartDate') ?? null` 다음 줄들을 찾아 그 사이에 watch 추가, `vrFields` 객체도 확장:

```ts
  const initialGradient = form.watch('initialGradient') ?? null
  const gGraceWeeks = form.watch('gGraceWeeks') ?? null
  const gStepWeeks = form.watch('gStepWeeks') ?? null
  const gMax = form.watch('gMax') ?? null
  const initialPoolLimitRate = form.watch('initialPoolLimitRate') ?? null
  const pGraceWeeks = form.watch('pGraceWeeks') ?? null
  const pStepWeeks = form.watch('pStepWeeks') ?? null
  const poolLimitFloor = form.watch('poolLimitFloor') ?? null
  const isVr = type === 'VR'
  const vrFields: VrFields = {
    avgPrice, quantity, intervalWeeks, bandWidth, recurringAmount,
    initialGradient, gGraceWeeks, gStepWeeks, gMax,
    initialPoolLimitRate, pGraceWeeks, pStepWeeks, poolLimitFloor,
  }
```

(`const isVr = type === 'VR'`은 기존 줄 — 위치만 8개 watch 뒤로 옮기고 `vrFields` 리터럴을 교체한다.)

- [ ] **Step 6: 교차 필드 검증 추가 (`isInvalidVr`)**

`isInvalidVr` 선언을 아래로 교체(기존 조건 뒤에 4줄 추가):

```ts
  const isInvalidVr = isVr && (
    intervalWeeks === null ||
    intervalWeeks < 1 ||
    !Number.isInteger(intervalWeeks) ||
    bandWidth === null ||
    bandWidth <= 0 ||
    (recurringAmount !== null && !Number.isInteger(recurringAmount)) ||
    (recurringMode !== 'HOLD' && recurringMagnitude <= 0) ||
    (normalizedRecurringAmount <= 0 && initialAssets <= 0) ||
    (normalizedRecurringAmount < 0 && initialAssets < requiredWithdrawalAssets) ||
    (gMax !== null && initialGradient !== null && gMax < initialGradient) ||
    (poolLimitFloor !== null && initialPoolLimitRate !== null && poolLimitFloor > initialPoolLimitRate)
  )
```

- [ ] **Step 7: `submitDisabledReason`의 VR 분기에 메시지 추가**

`isVr ? (() => { ... })() : ...` 블록 내부, `if (isRuntimeValueInvalid) return '현재 허용되지 않는 설정이 선택되었습니다.'` 바로 앞에 두 줄 추가:

```ts
          if (gMax !== null && initialGradient !== null && gMax < initialGradient) {
            return 'gradient 상한은 초기값 이상이어야 합니다.'
          }
          if (poolLimitFloor !== null && initialPoolLimitRate !== null && poolLimitFloor > initialPoolLimitRate) {
            return 'poolLimitRate 하한은 초기값 이하여야 합니다.'
          }
          if (isRuntimeValueInvalid) return '현재 허용되지 않는 설정이 선택되었습니다.'
```

- [ ] **Step 8: create payload 조립부에 8필드 추가**

`handleSubmit`의 create 분기(`isVr ? { intervalWeeks: ..., bandWidth: ..., recurringAmount: normalizedRecurringAmount, } : {}`)를 아래로 교체:

```ts
            // VR 전용 필드 — null이면 0으로 기본값 처리
            ...(isVr ? {
              intervalWeeks: runtimeStrategy?.fields.intervalWeeks?.customizable === false
                ? runtimeStrategy.fields.intervalWeeks.defaultValue
                : intervalWeeks ?? undefined,
              bandWidth: runtimeStrategy?.fields.bandWidth?.customizable === false
                ? runtimeStrategy.fields.bandWidth.defaultValue
                : bandWidth ?? undefined,
              recurringAmount: normalizedRecurringAmount,
              // 램프 파라미터 — 값이 있을 때만 포함(생략 시 서버 기본값 적용)
              ...(initialGradient !== null ? { initialGradient } : {}),
              ...(gGraceWeeks !== null ? { gGraceWeeks } : {}),
              ...(gStepWeeks !== null ? { gStepWeeks } : {}),
              ...(gMax !== null ? { gMax } : {}),
              ...(initialPoolLimitRate !== null ? { initialPoolLimitRate } : {}),
              ...(pGraceWeeks !== null ? { pGraceWeeks } : {}),
              ...(pStepWeeks !== null ? { pStepWeeks } : {}),
              ...(poolLimitFloor !== null ? { poolLimitFloor } : {}),
            } : {}),
```

- [ ] **Step 9: 실행 → 통과 확인**

Run: `npx vitest run features/strategy/create-strategy/model/useStrategyForm.test.ts`
Expected: PASS — 기존 `'VR create payload includes VR fields and forces cycleSeedType NONE'`(램프 필드 미입력 케이스)도 payload에 추가 키가 없는 그대로 계속 PASS해야 한다(값이 `null`이면 spread가 아무 것도 추가하지 않으므로).

- [ ] **Step 10: 전체 검증**

Run: `npm run typecheck && npx vitest run features/strategy/create-strategy`
Expected: 둘 다 PASS

- [ ] **Step 11: 커밋**

```bash
git add features/strategy/create-strategy/model/useStrategyForm.ts features/strategy/create-strategy/model/useStrategyForm.test.ts
git commit -m "$(cat <<'EOF'
feat(strategy): 전략 등록 폼에 VR 램프 8필드 입력·검증·payload 조립 추가

VrFields를 8필드 확장하고, gMax>=initialGradient·poolLimitFloor<=initialPoolLimitRate
교차 검증을 추가한다. 값이 있을 때만 payload에 포함해 생략 시 서버 기본값이
그대로 적용되도록 한다.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: create-strategy — `VrSettingsSection.tsx` 고급설정 접이식 + 안내 문구 수정

**Files:**
- Modify: `features/strategy/create-strategy/sections/VrSettingsSection.tsx`
- Test: `features/strategy/create-strategy/sections/VrSettingsSection.test.tsx`

**Interfaces:**
- Consumes: Task 5의 `VrFields`(8필드 포함), 기존 `setField: (field: keyof VrFields, value: number | null) => void`
- Produces: 등록 모드(`!isEdit`)에서만 보이는 `<details>` 고급설정 섹션. `isEdit` 안내 문구 변경.

- [ ] **Step 1: 기존 `baseFields`를 8필드 포함하도록 확장 (컴파일 전제)**

`VrSettingsSection.test.tsx`의 `baseFields` 선언을 아래로 교체(이 파일 전역에서 재사용되므로 한 곳만 고치면 모든 기존 테스트가 계속 동작한다):

```ts
  const baseFields: VrFields = {
    avgPrice: null,
    quantity: null,
    intervalWeeks: 2,
    bandWidth: 15,
    recurringAmount: 0,
    initialGradient: null,
    gGraceWeeks: null,
    gStepWeeks: null,
    gMax: null,
    initialPoolLimitRate: null,
    pGraceWeeks: null,
    pStepWeeks: null,
    poolLimitFloor: null,
  }
```

- [ ] **Step 2: 기존 안내 문구 테스트를 새 문구로 갱신, 신규 테스트 추가 (실패 예상)**

`'shows read-only initial V value and disables all inputs when isEdit is true'` 테스트 안의 마지막 expect를 교체:

```ts
      expect(screen.getByText('여기서는 변경할 수 없습니다 — 전략 상세 화면의 "VR 재설정"을 이용하세요.')).toBeInTheDocument()
```

파일 끝(`defaults and ordering` describe 블록 뒤)에 새 describe 추가:

```tsx
  describe('advanced ramp settings (registration only)', () => {
    it('renders the collapsible advanced section in create mode', () => {
      render(<VrSettingsSection fields={baseFields} {...baseProps} isEdit={false} />)
      expect(screen.getByText('고급 설정 (램프)')).toBeInTheDocument()
    })

    it('does not render the advanced section in edit mode', () => {
      render(<VrSettingsSection fields={baseFields} {...baseProps} isEdit={true} initialVrValue={3000} />)
      expect(screen.queryByText('고급 설정 (램프)')).not.toBeInTheDocument()
    })

    it('updates a ramp field through setField', () => {
      render(<VrSettingsSection fields={baseFields} {...baseProps} isEdit={false} />)
      const input = getInputByLabelText('초기 gradient(G)')
      fireEvent.change(input, { target: { value: '10' } })
      expect(mockSetField).toHaveBeenCalledWith('initialGradient', 10)
    })
  })
```

- [ ] **Step 3: 실행 → 실패 확인**

Run: `npx vitest run features/strategy/create-strategy/sections/VrSettingsSection.test.tsx`
Expected: FAIL — 옛 문구가 남아있고 고급설정 섹션이 아직 없음.

- [ ] **Step 4: 컴포넌트 구현**

`VrSettingsSection.tsx`의 `isEdit` 안내 문구 블록을 교체:

```tsx
      {isEdit && (
        <p className="text-sm text-muted-foreground mt-2 px-1">
          여기서는 변경할 수 없습니다 — 전략 상세 화면의 &quot;VR 재설정&quot;을 이용하세요.
        </p>
      )}
```

같은 파일의 return 문 마지막(위 블록 바로 앞), `</div>`(리밸런싱 주기 필드를 감싸는 `grid grid-cols-1 gap-y-5` 닫는 태그) 다음에 고급설정 섹션을 추가한다 — `!isEdit` 조건으로 등록 모드에서만 렌더:

```tsx
      {!isEdit && (
        <details className="mt-4 group">
          <summary className="cursor-pointer select-none text-sm font-bold text-muted-foreground list-none flex items-center gap-1.5">
            <span className="transition-transform group-open:rotate-90">▸</span>
            고급 설정 (램프)
          </summary>
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 mt-4">
            <label>
              <span className={FIELD_LABEL_CLASS}>초기 gradient(G)</span>
              <UnitInput value={fields.initialGradient} onChange={(v) => setField('initialGradient', v)} unit="" disabled={disabled} placeholder="자동" />
            </label>
            <label>
              <span className={FIELD_LABEL_CLASS}>gradient 상한</span>
              <UnitInput value={fields.gMax} onChange={(v) => setField('gMax', v)} unit="" disabled={disabled} placeholder="자동" />
            </label>
            <label>
              <span className={FIELD_LABEL_CLASS}>gradient 유예(주)</span>
              <UnitInput value={fields.gGraceWeeks} onChange={(v) => setField('gGraceWeeks', v)} unit="주" disabled={disabled} placeholder="52" />
            </label>
            <label>
              <span className={FIELD_LABEL_CLASS}>gradient 단계주기(주)</span>
              <UnitInput value={fields.gStepWeeks} onChange={(v) => setField('gStepWeeks', v)} unit="주" disabled={disabled} placeholder="26" />
            </label>
            <label>
              <span className={FIELD_LABEL_CLASS}>초기 poolLimitRate</span>
              <UnitInput value={fields.initialPoolLimitRate} onChange={(v) => setField('initialPoolLimitRate', v)} unit="" disabled={disabled} placeholder="자동" maxDecimals={2} />
            </label>
            <label>
              <span className={FIELD_LABEL_CLASS}>poolLimitRate 하한</span>
              <UnitInput value={fields.poolLimitFloor} onChange={(v) => setField('poolLimitFloor', v)} unit="" disabled={disabled} placeholder="자동" maxDecimals={2} />
            </label>
            <label>
              <span className={FIELD_LABEL_CLASS}>poolLimitRate 유예(주)</span>
              <UnitInput value={fields.pGraceWeeks} onChange={(v) => setField('pGraceWeeks', v)} unit="주" disabled={disabled} placeholder="52" />
            </label>
            <label>
              <span className={FIELD_LABEL_CLASS}>poolLimitRate 단계주기(주)</span>
              <UnitInput value={fields.pStepWeeks} onChange={(v) => setField('pStepWeeks', v)} unit="주" disabled={disabled} placeholder="26" />
            </label>
          </div>
        </details>
      )}
```

- [ ] **Step 5: 실행 → 통과 확인**

Run: `npx vitest run features/strategy/create-strategy/sections/VrSettingsSection.test.tsx`
Expected: PASS

- [ ] **Step 6: 전체 검증**

Run: `npm run typecheck && npx vitest run features/strategy/create-strategy`
Expected: 둘 다 PASS

- [ ] **Step 7: 커밋**

```bash
git add features/strategy/create-strategy/sections/VrSettingsSection.tsx features/strategy/create-strategy/sections/VrSettingsSection.test.tsx
git commit -m "$(cat <<'EOF'
feat(strategy): VR 등록 폼에 램프 고급설정 접이식 섹션 추가, 안내 문구 갱신

램프 8필드를 "고급 설정" 접이식 섹션으로 등록 모드에만 노출한다(수정 모드는
기존과 동일하게 숨김). "등록 후 변경 불가" 문구를 VR 재설정 기능 존재를
반영해 갱신한다.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

이로써 C, D가 완료된다.

---

## Task 7: reconfigure-vr — zod 검증 스키마

**Files:**
- Create: `features/strategy/reconfigure-vr/model/reconfigureVrFormSchema.ts`
- Test: `features/strategy/reconfigure-vr/model/reconfigureVrFormSchema.test.ts`

**Interfaces:**
- Produces: `reconfigureVrFormSchema`(zod), `type ReconfigureVrFormValues`

- [ ] **Step 1: 실패하는 테스트 작성**

`features/strategy/reconfigure-vr/model/reconfigureVrFormSchema.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { reconfigureVrFormSchema } from './reconfigureVrFormSchema'

describe('reconfigureVrFormSchema', () => {
  it('모든 필드를 생략해도 파싱 성공 (전부 optional)', () => {
    expect(reconfigureVrFormSchema.safeParse({}).success).toBe(true)
  })

  it('유효한 전체 조합은 파싱 성공', () => {
    const result = reconfigureVrFormSchema.safeParse({
      bandWidth: 20,
      intervalWeeks: 4,
      recurringAmount: -100,
      initialGradient: 10,
      gGraceWeeks: 52,
      gStepWeeks: 26,
      gMax: 20,
      initialPoolLimitRate: 0.75,
      pGraceWeeks: 52,
      pStepWeeks: 26,
      poolLimitFloor: 0.5,
      injectShares: 10,
      injectSharePrice: 62.5,
      injectDeposit: 500,
    })
    expect(result.success).toBe(true)
  })

  it('bandWidth가 0 이하면 실패', () => {
    expect(reconfigureVrFormSchema.safeParse({ bandWidth: 0 }).success).toBe(false)
  })

  it('intervalWeeks가 1 미만이면 실패', () => {
    expect(reconfigureVrFormSchema.safeParse({ intervalWeeks: 0 }).success).toBe(false)
  })

  it('gMax가 initialGradient보다 작으면 실패', () => {
    const result = reconfigureVrFormSchema.safeParse({ initialGradient: 10, gMax: 5 })
    expect(result.success).toBe(false)
  })

  it('poolLimitFloor가 initialPoolLimitRate보다 크면 실패', () => {
    const result = reconfigureVrFormSchema.safeParse({ initialPoolLimitRate: 0.5, poolLimitFloor: 0.75 })
    expect(result.success).toBe(false)
  })

  it('injectShares가 0보다 큰데 injectSharePrice가 없으면 실패', () => {
    const result = reconfigureVrFormSchema.safeParse({ injectShares: 10 })
    expect(result.success).toBe(false)
  })

  it('injectShares가 0보다 크고 injectSharePrice도 있으면 성공', () => {
    const result = reconfigureVrFormSchema.safeParse({ injectShares: 10, injectSharePrice: 62.5 })
    expect(result.success).toBe(true)
  })

  it('injectShares가 0이면 injectSharePrice 없이도 성공', () => {
    const result = reconfigureVrFormSchema.safeParse({ injectShares: 0 })
    expect(result.success).toBe(true)
  })

  it('injectDeposit이 음수면 실패', () => {
    expect(reconfigureVrFormSchema.safeParse({ injectDeposit: -1 }).success).toBe(false)
  })
})
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run features/strategy/reconfigure-vr/model/reconfigureVrFormSchema.test.ts`
Expected: FAIL — 모듈 자체가 없음.

- [ ] **Step 3: 스키마 구현**

`features/strategy/reconfigure-vr/model/reconfigureVrFormSchema.ts`:

```ts
import { z } from 'zod'

export const reconfigureVrFormSchema = z
  .object({
    bandWidth: z.number().positive().nullable().optional(),
    intervalWeeks: z.number().int().positive().nullable().optional(),
    recurringAmount: z.number().int().nullable().optional(),
    initialGradient: z.number().int().positive().nullable().optional(),
    gGraceWeeks: z.number().int().nonnegative().nullable().optional(),
    gStepWeeks: z.number().int().positive().nullable().optional(),
    gMax: z.number().int().positive().nullable().optional(),
    initialPoolLimitRate: z.number().positive().max(1).nullable().optional(),
    pGraceWeeks: z.number().int().nonnegative().nullable().optional(),
    pStepWeeks: z.number().int().positive().nullable().optional(),
    poolLimitFloor: z.number().positive().max(1).nullable().optional(),
    injectShares: z.number().int().nonnegative().nullable().optional(),
    injectSharePrice: z.number().positive().nullable().optional(),
    injectDeposit: z.number().nonnegative().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.gMax != null && data.initialGradient != null && data.gMax < data.initialGradient) {
      ctx.addIssue({ code: 'custom', path: ['gMax'], message: 'gradient 상한은 초기값 이상이어야 합니다.' })
    }
    if (data.poolLimitFloor != null && data.initialPoolLimitRate != null && data.poolLimitFloor > data.initialPoolLimitRate) {
      ctx.addIssue({ code: 'custom', path: ['poolLimitFloor'], message: 'poolLimitRate 하한은 초기값 이하여야 합니다.' })
    }
    if (data.injectShares != null && data.injectShares > 0 && (data.injectSharePrice == null || data.injectSharePrice <= 0)) {
      ctx.addIssue({ code: 'custom', path: ['injectSharePrice'], message: '주식을 편입하려면 매수단가를 입력하세요.' })
    }
  })

export type ReconfigureVrFormValues = z.infer<typeof reconfigureVrFormSchema>
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run features/strategy/reconfigure-vr/model/reconfigureVrFormSchema.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add features/strategy/reconfigure-vr/model/reconfigureVrFormSchema.ts features/strategy/reconfigure-vr/model/reconfigureVrFormSchema.test.ts
git commit -m "$(cat <<'EOF'
feat(strategy): VR 재설정 폼 zod 검증 스키마 추가

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: reconfigure-vr — 계좌·전략 로더

**Files:**
- Create: `features/strategy/reconfigure-vr/model/loadStrategyForReconfigure.ts`

**Interfaces:**
- Consumes: `@entities/account`의 `listAccounts`, `@entities/strategy`의 `listStrategies`
- Produces: `loadAccountAndStrategyForReconfigure(accountId: string, strategyId: string, token: string): Promise<{ account: Account; strategy: Strategy } | null>` — VR 전략이 아니면(`!strategy.vr`) `null` 반환

이 로더는 `features/strategy/create-strategy/model/loadStrategyFormContext.ts`의 `loadAccountAndStrategyForEdit`와 로직이 거의 동일하지만, **FSD 규칙상 feature 슬라이스끼리 cross-import가 금지**되어 있어 재사용하지 않고 신규 작성한다. 이 파일은 기존 `loadStrategyFormContext.ts`와 마찬가지로 전용 테스트가 없다(코드베이스 컨벤션 — Server Component 전용 얇은 데이터 로더는 테스트하지 않음).

- [ ] **Step 1: 로더 구현**

`features/strategy/reconfigure-vr/model/loadStrategyForReconfigure.ts`:

```ts
import { listAccounts } from '@entities/account'
import { listStrategies } from '@entities/strategy'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'

// VR 재설정 페이지(실제 라우트 + @modal 인터셉트 라우트)가 공유하는 계좌·전략 조회.
// features/strategy/create-strategy의 loadAccountAndStrategyForEdit와 로직은 동일하지만
// FSD 규칙상 feature 슬라이스끼리 cross-import가 금지돼 신규로 둔다.
export async function loadAccountAndStrategyForReconfigure(
  accountId: string,
  strategyId: string,
  token: string,
): Promise<{ account: Account; strategy: Strategy } | null> {
  const [accounts, strategies] = await Promise.all([
    listAccounts(token).catch((): Account[] => []),
    listStrategies(accountId, token).catch((): Strategy[] => []),
  ])
  const account = accounts.find((a) => a.id === accountId)
  const strategy = strategies.find((s) => s.id === strategyId)
  if (!account || !strategy || !strategy.vr) return null
  return { account, strategy }
}
```

- [ ] **Step 2: 타입체크**

Run: `npm run typecheck`
Expected: PASS (이 파일은 아직 아무 데서도 import되지 않으므로 미사용 경고는 없다 — named export이기 때문)

- [ ] **Step 3: 커밋**

```bash
git add features/strategy/reconfigure-vr/model/loadStrategyForReconfigure.ts
git commit -m "$(cat <<'EOF'
feat(strategy): VR 재설정 페이지용 계좌·전략 로더 추가

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: reconfigure-vr — `ReconfigureVrForm` 컴포넌트

**Files:**
- Create: `features/strategy/reconfigure-vr/ReconfigureVrForm.tsx`
- Test: `features/strategy/reconfigure-vr/ReconfigureVrForm.test.tsx`

**Interfaces:**
- Consumes: Task 3의 `useReconfigureVrMutation(strategyId, onSuccess?)`, Task 7의 `reconfigureVrFormSchema`/`ReconfigureVrFormValues`, `Strategy`(`@entities/strategy`)
- Produces: `ReconfigureVrForm({ accountId, strategy, dismiss? }: Props)` — `dismiss` 기본값 `'push'`(일반 라우트, `router.push`) / `'back'`(모달, `router.back`) — `StrategyFormPage`의 기존 `dismiss` 컨벤션과 동일.

- [ ] **Step 1: 실패하는 테스트 작성**

`features/strategy/reconfigure-vr/ReconfigureVrForm.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Strategy } from '@entities/strategy'
import { ReconfigureVrForm } from './ReconfigureVrForm'

const mutateMock = vi.fn()
const routerPushMock = vi.fn()
const routerBackMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock, back: routerBackMock }),
}))

vi.mock('@entities/strategy', () => ({
  useReconfigureVrMutation: () => ({ mutate: mutateMock, isPending: false }),
}))

const strategy: Strategy = {
  id: 'strategy-1',
  accountId: 'account-1',
  type: 'VR',
  status: 'ACTIVE',
  ticker: 'TQQQ',
  cycleSeedType: 'NONE',
  isReverseMode: false,
  vr: {
    value: 3000,
    bandWidth: 15,
    intervalWeeks: 4,
    recurringAmount: -100,
    poolLimit: 1000,
    gradient: 18, // 현재 스냅샷 — initialGradient(10)와 의도적으로 다르게 둠
    initialGradient: 10,
    gGraceWeeks: 52,
    gStepWeeks: 26,
    gMax: 20,
    initialPoolLimitRate: 0.75,
    pGraceWeeks: 52,
    pStepWeeks: 26,
    poolLimitFloor: 0.5,
  },
}

describe('ReconfigureVrForm', () => {
  beforeEach(() => {
    mutateMock.mockClear()
    routerPushMock.mockClear()
    routerBackMock.mockClear()
  })

  it('경고 배너를 상시 노출한다', () => {
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} />)
    expect(screen.getByText(/진행 중인 사이클이 즉시 종료되고 새 사이클이 시작되며/)).toBeInTheDocument()
  })

  it('램프 필드 초깃값을 gradient/poolLimit이 아닌 initialGradient/initialPoolLimitRate에서 채운다', () => {
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} />)
    const initialGradientInput = screen.getByLabelText('초기 gradient(G)') as HTMLInputElement
    const initialPoolLimitRateInput = screen.getByLabelText('초기 poolLimitRate') as HTMLInputElement
    expect(initialGradientInput.value).toBe('10')
    expect(initialPoolLimitRateInput.value).toBe('0.75')
  })

  it('제출 시 즉시 뮤테이션을 호출하지 않고 확인 다이얼로그를 먼저 띄운다', () => {
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} />)
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    expect(screen.getByText('VR 전략을 재설정하시겠습니까?')).toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('확인 다이얼로그에서 확정하면 현재 폼 값으로 뮤테이션을 호출한다', async () => {
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} />)
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(screen.getByRole('button', { name: '재설정 확정' }))

    await waitFor(() => expect(mutateMock).toHaveBeenCalled())
    expect(mutateMock.mock.calls[0][0]).toEqual(expect.objectContaining({
      bandWidth: 15,
      intervalWeeks: 4,
      initialGradient: 10,
      initialPoolLimitRate: 0.75,
    }))
  })

  it('인출 모드로 전환 후 금액을 입력하면 음수로 제출된다', async () => {
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} />)
    fireEvent.click(screen.getByRole('button', { name: '- 인출' }))
    fireEvent.change(screen.getByLabelText('적립금(+)/인출금(-)'), { target: { value: '200' } })
    fireEvent.click(screen.getByRole('button', { name: '재설정' }))
    fireEvent.click(screen.getByRole('button', { name: '재설정 확정' }))

    await waitFor(() => expect(mutateMock).toHaveBeenCalled())
    expect(mutateMock.mock.calls[0][0].recurringAmount).toBe(-200)
  })

  it('injectShares가 0보다 클 때만 매수단가 필드를 노출한다', () => {
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} />)
    expect(screen.queryByLabelText('매수단가 (USD)')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('편입 주식 수'), { target: { value: '10' } })

    expect(screen.getByLabelText('매수단가 (USD)')).toBeInTheDocument()
  })

  it('dismiss가 back이면 취소 클릭 시 router.back을 호출한다', () => {
    render(<ReconfigureVrForm accountId="account-1" strategy={strategy} dismiss="back" />)
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(routerBackMock).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `npx vitest run features/strategy/reconfigure-vr/ReconfigureVrForm.test.tsx`
Expected: FAIL — 모듈이 없음.

- [ ] **Step 3: 컴포넌트 구현**

`features/strategy/reconfigure-vr/ReconfigureVrForm.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectionCard } from '@shared/ui/selection-card'
import { cn } from '@shared/lib/utils'
import { useReconfigureVrMutation } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'
import { reconfigureVrFormSchema, type ReconfigureVrFormValues } from './model/reconfigureVrFormSchema'

interface Props {
  accountId: string
  strategy: Strategy
  // 'push': 일반 페이지 라우트. 'back': 인터셉팅 라우트(모달)
  dismiss?: 'push' | 'back'
}

type RecurringMode = 'DEPOSIT' | 'HOLD' | 'WITHDRAW'

function parseOptionalNumber(raw: string): number | undefined {
  if (raw.trim() === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

function ModeButton({
  children,
  selected,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  selected: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <SelectionCard
      selected={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn('h-11 px-3 text-center text-sm font-extrabold', !selected && 'text-muted-foreground')}
    >
      {children}
    </SelectionCard>
  )
}

export function ReconfigureVrForm({ accountId, strategy, dismiss = 'push' }: Props) {
  const router = useRouter()
  if (!strategy.vr) return null
  const vr = strategy.vr

  const backHref = `/accounts/${accountId}/strategies/${strategy.id}`
  const handleDone = dismiss === 'back' ? () => router.back() : () => router.push(backHref)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [recurringMode, setRecurringMode] = useState<RecurringMode>(
    vr.recurringAmount > 0 ? 'DEPOSIT' : vr.recurringAmount < 0 ? 'WITHDRAW' : 'HOLD',
  )

  const form = useForm<ReconfigureVrFormValues>({
    resolver: zodResolver(reconfigureVrFormSchema),
    defaultValues: {
      bandWidth: vr.bandWidth,
      intervalWeeks: vr.intervalWeeks,
      recurringAmount: vr.recurringAmount,
      initialGradient: vr.initialGradient,
      gGraceWeeks: vr.gGraceWeeks,
      gStepWeeks: vr.gStepWeeks,
      gMax: vr.gMax,
      initialPoolLimitRate: vr.initialPoolLimitRate,
      pGraceWeeks: vr.pGraceWeeks,
      pStepWeeks: vr.pStepWeeks,
      poolLimitFloor: vr.poolLimitFloor,
      injectShares: null,
      injectSharePrice: null,
      injectDeposit: null,
    },
  })

  const mutation = useReconfigureVrMutation(strategy.id, handleDone)
  const injectShares = form.watch('injectShares')
  const recurringAmountAbs = Math.abs(form.watch('recurringAmount') ?? 0)

  function handleRecurringModeChange(mode: RecurringMode) {
    setRecurringMode(mode)
    if (mode === 'HOLD') form.setValue('recurringAmount', 0)
  }

  function handleRecurringAmountChange(raw: string) {
    const magnitude = raw.trim() === '' ? 0 : Math.abs(Number(raw))
    form.setValue('recurringAmount', recurringMode === 'WITHDRAW' ? -magnitude : magnitude, { shouldValidate: true })
  }

  function onSubmit() {
    setConfirmOpen(true)
  }

  function handleConfirm() {
    mutation.mutate(form.getValues())
  }

  const disabled = mutation.isPending

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-start gap-2.5 rounded-[var(--r-sm)] bg-warn-bg text-warn px-4 py-3 text-sm font-medium">
        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
        <p>설정을 하나라도 변경하면 진행 중인 사이클이 즉시 종료되고 새 사이클이 시작되며, 오늘 접수된 미체결 주문이 모두 취소됩니다.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-foreground">파라미터</h2>
        <div className="space-y-2">
          <Label htmlFor="bandWidth">밴드 폭 (%)</Label>
          <Input
            id="bandWidth"
            type="text"
            inputMode="decimal"
            defaultValue={vr.bandWidth}
            disabled={disabled}
            onChange={(e) => form.setValue('bandWidth', parseOptionalNumber(e.target.value), { shouldValidate: true })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="intervalWeeks">리밸런싱 주기 (주)</Label>
          <Input
            id="intervalWeeks"
            type="text"
            inputMode="numeric"
            defaultValue={vr.intervalWeeks}
            disabled={disabled}
            onChange={(e) => form.setValue('intervalWeeks', parseOptionalNumber(e.target.value), { shouldValidate: true })}
          />
        </div>
        <div className="space-y-2">
          <Label>적립금(+)/인출금(-)</Label>
          <div className="grid grid-cols-3 gap-2">
            <ModeButton selected={recurringMode === 'DEPOSIT'} disabled={disabled} onClick={() => handleRecurringModeChange('DEPOSIT')}>+ 적립</ModeButton>
            <ModeButton selected={recurringMode === 'HOLD'} disabled={disabled} onClick={() => handleRecurringModeChange('HOLD')}>거치</ModeButton>
            <ModeButton selected={recurringMode === 'WITHDRAW'} disabled={disabled} onClick={() => handleRecurringModeChange('WITHDRAW')}>- 인출</ModeButton>
          </div>
          <Input
            type="text"
            inputMode="decimal"
            aria-label="적립금(+)/인출금(-)"
            disabled={disabled || recurringMode === 'HOLD'}
            defaultValue={recurringAmountAbs || ''}
            onChange={(e) => handleRecurringAmountChange(e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-foreground">램프 설정</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="initialGradient">초기 gradient(G)</Label>
            <Input id="initialGradient" type="text" inputMode="numeric" defaultValue={vr.initialGradient} disabled={disabled}
              onChange={(e) => form.setValue('initialGradient', parseOptionalNumber(e.target.value), { shouldValidate: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gMax">gradient 상한</Label>
            <Input id="gMax" type="text" inputMode="numeric" defaultValue={vr.gMax} disabled={disabled}
              onChange={(e) => form.setValue('gMax', parseOptionalNumber(e.target.value), { shouldValidate: true })} />
            {form.formState.errors.gMax && <p className="text-sm text-destructive">{form.formState.errors.gMax.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="gGraceWeeks">gradient 유예(주)</Label>
            <Input id="gGraceWeeks" type="text" inputMode="numeric" defaultValue={vr.gGraceWeeks} disabled={disabled}
              onChange={(e) => form.setValue('gGraceWeeks', parseOptionalNumber(e.target.value), { shouldValidate: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gStepWeeks">gradient 단계주기(주)</Label>
            <Input id="gStepWeeks" type="text" inputMode="numeric" defaultValue={vr.gStepWeeks} disabled={disabled}
              onChange={(e) => form.setValue('gStepWeeks', parseOptionalNumber(e.target.value), { shouldValidate: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="initialPoolLimitRate">초기 poolLimitRate</Label>
            <Input id="initialPoolLimitRate" type="text" inputMode="decimal" defaultValue={vr.initialPoolLimitRate} disabled={disabled}
              onChange={(e) => form.setValue('initialPoolLimitRate', parseOptionalNumber(e.target.value), { shouldValidate: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="poolLimitFloor">poolLimitRate 하한</Label>
            <Input id="poolLimitFloor" type="text" inputMode="decimal" defaultValue={vr.poolLimitFloor} disabled={disabled}
              onChange={(e) => form.setValue('poolLimitFloor', parseOptionalNumber(e.target.value), { shouldValidate: true })} />
            {form.formState.errors.poolLimitFloor && <p className="text-sm text-destructive">{form.formState.errors.poolLimitFloor.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pGraceWeeks">poolLimitRate 유예(주)</Label>
            <Input id="pGraceWeeks" type="text" inputMode="numeric" defaultValue={vr.pGraceWeeks} disabled={disabled}
              onChange={(e) => form.setValue('pGraceWeeks', parseOptionalNumber(e.target.value), { shouldValidate: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pStepWeeks">poolLimitRate 단계주기(주)</Label>
            <Input id="pStepWeeks" type="text" inputMode="numeric" defaultValue={vr.pStepWeeks} disabled={disabled}
              onChange={(e) => form.setValue('pStepWeeks', parseOptionalNumber(e.target.value), { shouldValidate: true })} />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-[var(--r-sm)] border border-border p-4">
        <h2 className="text-sm font-bold text-foreground">자본 주입 (선택)</h2>
        <p className="text-xs text-muted-foreground">설정 변경과 별개로 보유 주식·예수금을 추가로 편입합니다. 비워두면 주입하지 않습니다.</p>
        <div className="space-y-2">
          <Label htmlFor="injectShares">편입 주식 수</Label>
          <Input id="injectShares" type="text" inputMode="numeric" placeholder="0" disabled={disabled}
            onChange={(e) => form.setValue('injectShares', parseOptionalNumber(e.target.value), { shouldValidate: true })} />
        </div>
        {injectShares != null && injectShares > 0 && (
          <div className="space-y-2">
            <Label htmlFor="injectSharePrice">매수단가 (USD)</Label>
            <Input id="injectSharePrice" type="text" inputMode="decimal" disabled={disabled}
              onChange={(e) => form.setValue('injectSharePrice', parseOptionalNumber(e.target.value), { shouldValidate: true })} />
            {form.formState.errors.injectSharePrice && <p className="text-sm text-destructive">{form.formState.errors.injectSharePrice.message}</p>}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="injectDeposit">추가 예수금 (USD)</Label>
          <Input id="injectDeposit" type="text" inputMode="decimal" placeholder="0" disabled={disabled}
            onChange={(e) => form.setValue('injectDeposit', parseOptionalNumber(e.target.value), { shouldValidate: true })} />
        </div>
      </section>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1 h-12" onClick={handleDone} disabled={disabled}>
          취소
        </Button>
        <Button type="submit" variant="destructive" className="flex-1 h-12" disabled={disabled}>
          재설정
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>VR 전략을 재설정하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              진행 중인 사이클이 즉시 종료되고 새 사이클이 시작됩니다. 오늘 접수된 미체결 주문은 모두 취소됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disabled}>취소</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirm} disabled={disabled}>
              {mutation.isPending ? '재설정 중...' : '재설정 확정'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
```

- [ ] **Step 4: 실행 → 통과 확인**

Run: `npx vitest run features/strategy/reconfigure-vr/ReconfigureVrForm.test.tsx`
Expected: PASS

- [ ] **Step 5: 전체 검증**

Run: `npm run typecheck && npx vitest run features/strategy/reconfigure-vr`
Expected: 둘 다 PASS

- [ ] **Step 6: 커밋**

```bash
git add features/strategy/reconfigure-vr/ReconfigureVrForm.tsx features/strategy/reconfigure-vr/ReconfigureVrForm.test.tsx
git commit -m "$(cat <<'EOF'
feat(strategy): VR 재설정 폼 컴포넌트 추가

경고 배너 상시 노출 + 파라미터/램프/자본주입 3그룹 필드 + 확인 다이얼로그
(기존 삭제 AlertDialog 패턴 재사용) 구조. 초깃값은 gradient/poolLimit(현재
스냅샷)이 아닌 initialGradient/initialPoolLimitRate(램프 0주차 값)에서 채운다.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: reconfigure-vr — index.ts + app 라우트(실제 페이지 + @modal)

**Files:**
- Create: `features/strategy/reconfigure-vr/index.ts`
- Create: `app/(main)/accounts/[id]/strategies/[sid]/reconfigure-vr/page.tsx`
- Create: `app/(main)/accounts/[id]/strategies/[sid]/reconfigure-vr/loading.tsx`
- Create: `app/(main)/@modal/(.)accounts/[id]/strategies/[sid]/reconfigure-vr/page.tsx`
- Create: `app/(main)/@modal/(.)accounts/[id]/strategies/[sid]/reconfigure-vr/loading.tsx`

**Interfaces:**
- Consumes: Task 8의 `loadAccountAndStrategyForReconfigure`, Task 9의 `ReconfigureVrForm`

이 태스크는 Server Component 라우트 배선이라 코드베이스 컨벤션상 전용 테스트가 없다(`strategies/[sid]/edit`도 동일). 대신 typecheck + 수동 브라우저 확인으로 검증한다.

- [ ] **Step 1: `features/strategy/reconfigure-vr/index.ts` 작성**

```ts
export { ReconfigureVrForm } from './ReconfigureVrForm'
export { loadAccountAndStrategyForReconfigure } from './model/loadStrategyForReconfigure'
```

- [ ] **Step 2: 실제 페이지 작성**

`app/(main)/accounts/[id]/strategies/[sid]/reconfigure-vr/page.tsx`:

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { ReconfigureVrForm, loadAccountAndStrategyForReconfigure } from '@features/strategy/reconfigure-vr'
import { getAuthToken } from '@shared/lib/auth/token'

interface Props {
  params: Promise<{ id: string; sid: string }>
}

export const metadata: Metadata = {
  title: 'VR 재설정 | KISTA',
  description: 'VR 전략의 밴드폭·주기·램프 파라미터를 재설정하고 자본을 주입합니다',
}

export default async function ReconfigureVrPage({ params }: Props) {
  const [{ id, sid }, token] = await Promise.all([params, getAuthToken()])

  if (!token) {
    return notFound()
  }

  const context = await loadAccountAndStrategyForReconfigure(id, sid, token)
  if (!context) {
    return notFound()
  }
  const { strategy } = context

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader eyebrow={strategy.ticker} eyebrowHref={`/accounts/${id}/strategies/${sid}`} title="VR 재설정" />
      <ReconfigureVrForm accountId={id} strategy={strategy} />
    </div>
  )
}
```

- [ ] **Step 3: 실제 페이지용 `loading.tsx` 작성**

`app/(main)/accounts/[id]/strategies/[sid]/reconfigure-vr/loading.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@shared/ui/CardSkeleton'

export default function ReconfigureVrLoading() {
  return (
    <div className="animate-pulse max-w-lg mx-auto space-y-4">
      <Skeleton className="h-8 w-32 mb-6" />
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} className="h-16" />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: `@modal` 인터셉팅 페이지 작성**

`app/(main)/@modal/(.)accounts/[id]/strategies/[sid]/reconfigure-vr/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { PageHeader } from '@widgets/page-header'
import { ReconfigureVrForm, loadAccountAndStrategyForReconfigure } from '@features/strategy/reconfigure-vr'
import { RouteModal } from '@shared/ui/RouteModal'
import { getAuthToken } from '@shared/lib/auth/token'

interface Props {
  params: Promise<{ id: string; sid: string }>
}

export default async function ReconfigureVrModal({ params }: Props) {
  const [{ id, sid }, token] = await Promise.all([params, getAuthToken()])

  if (!token) {
    return notFound()
  }

  const context = await loadAccountAndStrategyForReconfigure(id, sid, token)
  if (!context) {
    return notFound()
  }
  const { strategy } = context

  return (
    <RouteModal>
      <PageHeader eyebrow={strategy.ticker} eyebrowHref={`/accounts/${id}/strategies/${sid}`} title="VR 재설정" />
      <ReconfigureVrForm accountId={id} strategy={strategy} dismiss="back" />
    </RouteModal>
  )
}
```

- [ ] **Step 5: `@modal` 로딩 상태 작성**

`app/(main)/@modal/(.)accounts/[id]/strategies/[sid]/reconfigure-vr/loading.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@shared/ui/CardSkeleton'
import { RouteModal } from '@shared/ui/RouteModal'

export default function ReconfigureVrModalLoading() {
  return (
    <RouteModal>
      <div className="animate-pulse space-y-4">
        <Skeleton className="h-8 w-32 mb-6" />
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} className="h-16" />
        ))}
      </div>
    </RouteModal>
  )
}
```

- [ ] **Step 6: 타입체크**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 7: 커밋**

```bash
git add features/strategy/reconfigure-vr/index.ts \
  "app/(main)/accounts/[id]/strategies/[sid]/reconfigure-vr" \
  "app/(main)/@modal/(.)accounts/[id]/strategies/[sid]/reconfigure-vr"
git commit -m "$(cat <<'EOF'
feat(strategy): VR 재설정 라우트 배선 (실제 페이지 + PC 인터셉팅 모달)

strategies/[sid]/edit와 동일한 RouteModal + @modal 인터셉팅 라우트 패턴.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: 전략 상세 페이지 — "VR 재설정" 진입 링크 추가

**Files:**
- Modify: `app/(main)/accounts/[id]/strategies/[sid]/page.tsx`

**Interfaces:**
- Consumes: 기존 `strategy.vr`(존재 여부로 조건 렌더)

- [ ] **Step 1: `PageHeader actions`에 조건부 링크 추가**

`app/(main)/accounts/[id]/strategies/[sid]/page.tsx`의 `actions` prop을 아래로 교체:

```tsx
        actions={
          <>
            {strategy.vr && (
              <Link href={`/accounts/${id}/strategies/${sid}/reconfigure-vr`} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
                VR 재설정
              </Link>
            )}
            <Link href={`/accounts/${id}/strategies/${sid}/edit`} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              수정
            </Link>
          </>
        }
```

(`PageHeader`가 `actions`를 `flex items-center gap-2` 컨테이너로 이미 감싸므로 별도 wrapper div는 추가하지 않는다.)

- [ ] **Step 2: 타입체크**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: 개발 서버로 수동 확인**

Run: `npm run dev` (백그라운드) → `cat /tmp/kista_dev.log | grep "Local:"`로 포트 확인 → VR 전략 상세 페이지에서 "VR 재설정" 링크가 "수정" 옆에 보이는지, 클릭 시 PC에서는 모달로, 모바일 너비에서는 풀페이지로 뜨는지 확인. 비VR 전략 상세 페이지에는 "VR 재설정" 링크가 없는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add "app/(main)/accounts/[id]/strategies/[sid]/page.tsx"
git commit -m "$(cat <<'EOF'
feat(strategy): 전략 상세 페이지에 VR 재설정 진입 링크 추가

VR 전략(strategy.vr 존재)에만 "수정" 옆에 "VR 재설정" 링크를 노출한다.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

이로써 B가 완료된다 — A/B/C/D 전체 범위가 구현됐다.

---

## Task 12: 전체 회귀 검증

**Files:** 없음(검증 전용)

- [ ] **Step 1: 전체 typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 2: 전체 테스트 스위트**

Run: `npm run test:run`
Expected: 워크트리 baseline과 동일하게 `app/(admin)/layout.test.tsx`의 기존 무관 실패 1건을 제외하고 전부 PASS. 이 계획으로 새로 추가·수정한 테스트(entities/strategy, create-strategy, reconfigure-vr)는 전부 PASS해야 한다. 그 외 실패가 있으면 회귀이므로 원인을 찾아 수정한다.

- [ ] **Step 3: README 드리프트 점검**

`README.md`에 전략 등록/수정 관련 라우트 목록이나 아키텍처 다이어그램이 있으면 `reconfigure-vr` 라우트 추가를 반영할 필요가 있는지 확인한다(`grep -n "strategies\[sid\]\|reconfigure\|edit" README.md`). 언급이 없으면 수정 불필요.

- [ ] **Step 4: 최종 확인**

```bash
git log --oneline -13
git status
```

Expected: Task 1~11의 커밋이 순서대로 남아있고, working tree가 clean.

---

## Self-Review 결과

- **Spec coverage**: A(타입·정규화·API·훅) → Task 1~3, B(진입점+재설정 폼) → Task 8~11, C(등록 폼 고급설정) → Task 4~6, D(안내 문구) → Task 6에 포함. 검증 규칙·경고 문구·자본 주입 필드·확인 다이얼로그 모두 Task 9에 반영됨.
- **Placeholder scan**: "TODO"/"이후 추가" 등 표현 없음. 모든 Step에 실행 가능한 코드/명령을 포함.
- **Type consistency**: `VrFields`(Task 5) → `VrSettingsSection`(Task 6)의 `fields.initialGradient` 등 참조와 일치. `ReconfigureVrRequest`(Task 1) → `useReconfigureVrMutation`(Task 3)의 `mutationFn` 파라미터 → `ReconfigureVrForm`(Task 9)의 `mutation.mutate(form.getValues())` 반환 타입(`ReconfigureVrFormValues`, Task 7)까지 필드명이 전부 일치(`bandWidth`, `intervalWeeks`, `recurringAmount`, `initialGradient`, `gGraceWeeks`, `gStepWeeks`, `gMax`, `initialPoolLimitRate`, `pGraceWeeks`, `pStepWeeks`, `poolLimitFloor`, `injectShares`, `injectSharePrice`, `injectDeposit`).
- **FSD 위반 회피**: 신규 로더(Task 8)는 `create-strategy`의 `loadAccountAndStrategyForEdit`를 재사용하지 않고 별도 작성. `ReconfigureVrForm`(Task 9)은 `create-strategy`의 `UnitInput`/`StrategyFieldLabel`을 재사용하지 않고 `shared`/`components/ui`(도메인 무관)만 사용해 cross-feature import를 피한다.
