# Strategy Edit Seed Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전략 수정에서 기본적으로 시드 수정을 막되, 최신 holdings가 0일 때만 등록 화면과 동일한 시드 수정 플로우를 허용한다.

**Architecture:** `kista-api`가 holdings 기반 수정 가능 여부와 시드 수정 검증의 SSOT가 된다. `kista-ui`는 서버가 내려준 현재 holdings를 기준으로 수정 화면을 read-only 또는 editable로 분기하고, editable edit일 때만 `initialUsdDeposit`를 PUT payload에 포함한다.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Spring Boot 3, Java 21, JUnit

## Global Constraints

- `holdings > 0`이면 시드 수정 불가
- `holdings === 0`이면 시드 수정 가능
- `cycleSeedType` 변경은 기존처럼 항상 허용
- `holdings === 0` 수정 성공 시 `strategy_cycle.start_amount`와 최신 `cycle_position` 시작점 행을 함께 갱신
- 최신 `cycle_position` 행을 직접 갱신하고 새 스냅샷 append는 하지 않는다
- INFINITE / PRIVACY 구분 없이 동일 정책 적용
- Tailwind 클래스만 사용하고 인라인 style 추가는 금지한다
- 기본 검증은 `npm run typecheck`와 `../kista-api/./gradlew test` 또는 최소 관련 테스트를 우선 사용한다

---

### Task 1: kista-api에서 holdings gate와 cycle start update 경로 추가

**Files:**
- Modify: `../kista-api/src/main/java/com/kista/application/service/strategy/StrategyService.java`
- Modify: `../kista-api/src/main/java/com/kista/domain/port/out/CyclePositionPort.java`
- Modify: `../kista-api/src/main/java/com/kista/adapter/out/persistence/strategy/CyclePositionPersistenceAdapter.java`
- Modify: `../kista-api/src/main/java/com/kista/domain/model/strategy/StrategyDetail.java`
- Modify: `../kista-api/src/main/java/com/kista/adapter/in/web/dto/TradingCycleResponse.java`
- Test: `../kista-api/src/test/java/.../StrategyService*Test.java` 또는 신규 테스트 파일

**Interfaces:**
- Produces: `StrategyDetail.currentHoldings`, `CyclePositionPort.updateCycleStartSnapshot(UUID strategyId, BigDecimal newSeed, BigDecimal newDeposit)`, holdings gate on `StrategyService.update(...)`

- [ ] **Step 1: failing backend test 작성**

테스트 시나리오:
```java
@Test
void holdings가_0이면_시드_수정을_허용하고_cycle_start를_함께_갱신한다()

@Test
void holdings가_0보다_크면_시드_수정을_거절한다()
```

검증:
- 첫 테스트: `strategyCyclePort.updateStartAmount(...)` 호출
- 첫 테스트: `cyclePositionPort.updateCycleStartSnapshot(...)` 호출
- 둘째 테스트: `IllegalArgumentException` 발생

- [ ] **Step 2: RED 확인**

Run:
```bash
cd /Users/phs/workspace/kista/kista-ui/../kista-api
./gradlew test --tests '*StrategyService*'
```
Expected: FAIL

- [ ] **Step 3: `StrategyDetail`과 응답 DTO에 currentHoldings 추가**

목표 시그니처:
```java
public record StrategyDetail(
        Strategy strategy,
        BigDecimal initialUsdDeposit,
        int divisionCount,
        boolean isReverseMode,
        double currentRound,
        int currentHoldings
) {}
```

- [ ] **Step 4: `CyclePositionPort`에 시작점 갱신 메서드 추가**

추가 인터페이스:
```java
void updateCycleStartSnapshot(UUID strategyId, BigDecimal newSeed, BigDecimal newDeposit);
```

구현 규칙:
- 최신 strategy 기준 `cycle_position` 1건 조회
- `holdings == 0` 전제
- 기존 행의 `usdDeposit`만 새 시드 기준 현금값으로 갱신
- `avgPrice`, `holdings`, `closingPrice`는 시작점 의미를 유지하는 범위에서 기존 값 유지

- [ ] **Step 5: `StrategyService.update()` / `updateSeed()`에 holdings gate 적용**

핵심 로직:
```java
if (latest.holdings() != 0) {
    throw new IllegalArgumentException("보유 수량이 있는 사이클은 시드를 수정할 수 없습니다");
}

BigDecimal newDeposit = newSeed;
strategyCyclePort.updateStartAmount(cycle.id(), newSeed);
cyclePositionPort.updateCycleStartSnapshot(strategyId, newSeed, newDeposit);
```

주의:
- 시작점 보정이므로 `purchaseAmount` 계산 분기 제거
- holdings 0에서만 허용되므로 `newDeposit = newSeed`

- [ ] **Step 6: backend test GREEN 확인**

Run:
```bash
cd /Users/phs/workspace/kista/kista-ui/../kista-api
./gradlew test --tests '*StrategyService*'
```
Expected: PASS

- [ ] **Step 7: compile 검증**

Run:
```bash
cd /Users/phs/workspace/kista/kista-ui/../kista-api
./gradlew compileJava
```
Expected: PASS

---

### Task 2: kista-ui가 currentHoldings 기반으로 수정 UI를 분기

**Files:**
- Modify: `entities/strategy/model/types.ts`
- Modify: `entities/strategy/api/index.ts`
- Modify: `features/strategy/create-strategy/model/useStrategyForm.ts`
- Modify: `features/strategy/create-strategy/model/useSeedModel.ts`
- Modify: `features/strategy/create-strategy/StrategyForm.tsx`
- Modify: `features/strategy/create-strategy/sections/ReadOnlySeedSection.tsx`
- Modify: `features/strategy/create-strategy/sections/UsageRatioSection.tsx`
- Test: `features/strategy/create-strategy/model/useStrategyForm.test.ts`
- Test: `features/strategy/create-strategy/StrategyForm.test.tsx`

**Interfaces:**
- Consumes: `Strategy.currentHoldings?: number`
- Produces: editable edit mode when `currentHoldings === 0`

- [ ] **Step 1: failing UI/model test 작성**

테스트 시나리오:
```ts
it('holdings가 0인 수정 모드에서는 initialUsdDeposit를 payload에 포함한다')
it('holdings가 1 이상인 수정 모드에서는 read-only seed section을 보여준다')
it('holdings가 0인 수정 모드에서는 등록과 같은 seed input section을 보여준다')
```

- [ ] **Step 2: RED 확인**

Run:
```bash
npm run test:run -- features/strategy/create-strategy/model/useStrategyForm.test.ts features/strategy/create-strategy/StrategyForm.test.tsx
```
Expected: FAIL

- [ ] **Step 3: strategy type에 currentHoldings 추가**

추가 필드:
```ts
currentHoldings?: number
```

normalize:
```ts
currentHoldings: s.currentHoldings != null ? Number(s.currentHoldings) : undefined,
```

- [ ] **Step 4: `useStrategyForm`에서 editable edit 분기 추가**

파생값:
```ts
const canEditSeed = !!initial && (initial.currentHoldings ?? 0) === 0
```

submit payload:
```ts
const payload: StrategyRequest = initial
  ? {
      type: initial.type,
      ticker: initial.ticker,
      cycleSeedType,
      ...(canEditSeed ? { initialUsdDeposit: seedUsd ?? undefined } : {}),
    }
  : ...
```

validation:
```ts
const cannotSubmit = initial && !canEditSeed
  ? false
  : ...
```

- [ ] **Step 5: `useSeedModel`을 조건부 edit 지원으로 복구**

입력:
```ts
editableEdit?: boolean
```

핵심:
- `editableEdit`이면 수정 모드도 `seedUsdInput` 기반 계산 허용
- read-only edit면 기존처럼 입력 상태가 제출에 관여하지 않음

- [ ] **Step 6: `StrategyForm.tsx` 분기 변경**

렌더 규칙:
```tsx
initial && !form.canEditSeed ? (
  <ReadOnlySeedSection ... />
) : (
  <UsageRatioSection ... isEdit={!!initial} editHint="첫 매매 전이라 시드 수정이 가능합니다" />
)
```

- [ ] **Step 7: UI/model tests GREEN 확인**

Run:
```bash
npm run test:run -- features/strategy/create-strategy/model/useStrategyForm.test.ts features/strategy/create-strategy/StrategyForm.test.tsx features/strategy/create-strategy/model/strategyFormSchema.test.ts
```
Expected: PASS

- [ ] **Step 8: 타입 검사**

Run:
```bash
npm run typecheck
```
Expected: PASS

---

### Task 3: 전략 상세 데이터 연결과 문구/문서 정리

**Files:**
- Modify: `app/(main)/accounts/[id]/strategies/[sid]/page.tsx`
- Modify: `widgets/strategy-detail/StrategyDetail.tsx`
- Modify: `docs/agents/features.md`
- Modify: `docs/superpowers/specs/2026-06-29-strategy-edit-seed-removal-design.md` if implementation detail needs sync
- Test: targeted manual verification notes

**Interfaces:**
- Consumes: updated `Strategy.currentHoldings`
- Produces: user-visible conditional editing behavior and updated docs

- [ ] **Step 1: 상세 화면이 수정 가능 조건을 설명하는지 확인하고 필요 시 문구 추가**

예시:
```tsx
{strategy.currentHoldings === 0 && (
  <p className="text-sm text-muted-foreground">첫 매매 전이라 시드 수정이 가능합니다.</p>
)}
```

- [ ] **Step 2: agent 문서 갱신**

추가 문구:
```md
- **`strategy/create-strategy`**: 수정 모드는 기본적으로 시작금액 읽기 전용이며, `currentHoldings === 0`일 때만 등록과 같은 시드 입력 UI를 사용
```

- [ ] **Step 3: 최소 자동 검증**

Run:
```bash
npm run test:run -- features/strategy/create-strategy/StrategyForm.test.tsx features/strategy/create-strategy/model/useStrategyForm.test.ts features/strategy/create-strategy/model/strategyFormSchema.test.ts
npm run typecheck
cd /Users/phs/workspace/kista/kista-ui/../kista-api && ./gradlew test --tests '*StrategyService*'
```
Expected: PASS

- [ ] **Step 4: 수동 확인 기록**

체크리스트:
- holdings 0 전략 수정 화면에서 시드 입력 UI가 보임
- holdings 0 전략 수정 저장 후 시작금액이 갱신됨
- holdings > 0 전략 수정 화면에서는 읽기 전용 유지
- holdings > 0 전략 수정 시 newSeed 요청이 서버에서 거절됨

- [ ] **Step 5: 커밋**

```bash
git add /Users/phs/workspace/kista/kista-ui
git commit -m "기능(전략): holdings 0일 때 시드 수정 예외 허용"
```
