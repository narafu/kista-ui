# VR 초기 V값 직접 입력 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** VR 전략 등록 시 사용자가 "초기 V"를 직접 입력하면 그 값을 V값(리밸런싱 기준선)으로 저장하고, 입력이 없으면 기존처럼 평가금(전일종가×보유수량)을, 그것도 없으면 첫 매수 후 산정하는 기존 동작을 유지한다.

**Architecture:** kista-api에 VR 전용 `initialVrValue` 필드를 추가해 V값 override 우선순위를 서버가 판단하게 하고(실제 포지션 평가금·인출식 안전장치는 override와 무관하게 항상 실제 시장가 기준 유지), kista-ui `VrSettingsSection`의 등록 전용 "고급 설정"에 이를 입력하는 필드를 추가한다.

**Tech Stack:** Java 21 / Spring Boot 3 (kista-api), Next.js 16 / TypeScript / react-hook-form / zod (kista-ui)

**설계 문서:** `kista-api/docs/superpowers/specs/2026-07-30-vr-explicit-initial-value-design.md`, `kista-ui/docs/superpowers/specs/2026-07-30-vr-explicit-initial-value-design.md`

---

## Backend (kista-api)

### Task 1: `TradingCycleRequest`에 `initialVrValue` 필드 추가

**Files:**
- Modify: `C:\Users\USER\workspace\kista\kista-api\src\main\java\com\kista\adapter\in\web\dto\TradingCycleRequest.java`
- Modify: `C:\Users\USER\workspace\kista\kista-api\src\test\java\com\kista\adapter\in\web\dto\TradingCycleRequestTest.java`

- [ ] **Step 1: `TradingCycleRequest`에 필드 추가 + `toRegisterCommand()` 갱신**

`scheduledStartDate` 필드 바로 뒤에 추가(레코드는 JSON 역직렬화에 쓰이는 단일 canonical 생성자이므로 이 파일은 telescoping 생성자를 만들지 않고 필드를 그대로 추가한다):

```java
        @Schema(description = "시작예정일, 기본값=오늘, 오늘 이후만 허용", example = "2026-08-01")
        LocalDate scheduledStartDate,
        @Schema(description = "VR: 초기 V값 직접 지정 (지정 시 전일종가×보유수량 계산을 대체, 생략 시 평가금 기준. 첫 매수 후 산정하려면 평가금·예수금과 함께 생략)", example = "5000.00")
        BigDecimal initialVrValue
) {
    public RegisterStrategyCommand toRegisterCommand() {
        return new RegisterStrategyCommand(type, ticker, initialUsdDeposit, cycleSeedType,
                divisionCount != null ? divisionCount : 0,
                initialHoldings, initialAvgPrice,
                intervalWeeks, bandWidth,
                recurringAmount != null ? recurringAmount : 0,
                initialGradient, gGraceWeeks, gStepWeeks, gMax,
                initialPoolLimitRate, pGraceWeeks, pStepWeeks, poolLimitFloor,
                scheduledStartDate, initialVrValue);
    }

    public UpdateStrategyCommand toUpdateCommand() {
        return new UpdateStrategyCommand(cycleSeedType, initialUsdDeposit);
    }
}
```

- [ ] **Step 2: 기존 테스트 2건에 `null` 인자 추가**

`TradingCycleRequestTest.java`의 두 생성자 호출 모두 마지막 줄 끝에 `,\n                null);`을 추가해 20번째 인자를 채운다:

```java
    @Test
    void omittedDivisionCountMapsToCommandSentinel() {
        TradingCycleRequest request = new TradingCycleRequest(
                Strategy.Type.INFINITE, null, null, null, null,
                null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                null, null);

        assertThat(request.toRegisterCommand().divisionCount()).isZero();
    }

    @Test
    void scheduledStartDateIsPassedThroughToRegisterCommand() {
        LocalDate scheduledStartDate = LocalDate.of(2026, 8, 1);
        TradingCycleRequest request = new TradingCycleRequest(
                Strategy.Type.INFINITE, null, null, null, null,
                null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                scheduledStartDate, null);

        assertThat(request.toRegisterCommand().scheduledStartDate()).isEqualTo(scheduledStartDate);
    }
```

- [ ] **Step 3: `initialVrValue` 전달 테스트 추가**

같은 파일에 새 테스트를 추가한다:

```java
    @Test
    void initialVrValueIsPassedThroughToRegisterCommand() {
        TradingCycleRequest request = new TradingCycleRequest(
                Strategy.Type.VR, null, null, null, null,
                null, null, null, null, null,
                null, null, null, null, null, null, null, null,
                null, new BigDecimal("5000.00"));

        assertThat(request.toRegisterCommand().initialVrValue()).isEqualByComparingTo("5000.00");
    }
```

`import java.math.BigDecimal;`이 파일 상단에 이미 없다면 추가한다(현재 파일에 `LocalDate`만 import되어 있으므로 확인 필요).

- [ ] **Step 4: 컴파일 확인**

Run: `cd "C:\Users\USER\workspace\kista\kista-api" && bash gradlew compileTestJava`
Expected: BUILD SUCCESSFUL (아직 `RegisterStrategyCommand`에 필드가 없어 실패한다 — Task 2 완료 후 다시 확인)

---

### Task 2: `RegisterStrategyCommand`에 `initialVrValue` 필드 추가 (기존 34개 호출부 호환 유지)

**Files:**
- Modify: `C:\Users\USER\workspace\kista\kista-api\src\main\java\com\kista\domain\model\strategy\RegisterStrategyCommand.java`

기존 코드베이스에 `new RegisterStrategyCommand(...)` 호출이 34곳(대부분 테스트) 있다. 필드를 맨 뒤에 추가하고, 기존 19개 인자 호출부가 그대로 컴파일되도록 **19개 인자를 받는 보조 생성자**를 추가해 `initialVrValue=null`로 위임한다. 레코드는 여러 생성자를 가질 수 있다.

- [ ] **Step 1: 필드 추가 + 보조 생성자 작성**

```java
package com.kista.domain.model.strategy;

import java.math.BigDecimal;
import java.time.LocalDate;

// 전략 등록 인바운드 파라미터
public record RegisterStrategyCommand(
        Strategy.Type type,
        Strategy.Ticker ticker,                      // null이면 전략 기본값
        BigDecimal initialUsdDeposit,                // null 허용 (선택 입력), VR에서는 예수금(초기 pool)으로 재사용
        Strategy.CycleSeedType cycleSeedType,        // null이면 NONE으로 처리
        int divisionCount,                           // 분할 수 (20/30/40), 0은 미입력 sentinel로 런타임 기본값 적용
        // 중간부터 시작 — 기존 보유 수량·평단가 (세 전략 공통, null/0이면 빈 포지션에서 시작)
        Integer initialHoldings,                      // 등록 시점 기존 보유 수량
        BigDecimal initialAvgPrice,                   // 등록 시점 기존 평단가 (initialHoldings>0이면 필수)
        // VR 전략 전용 필드 (비VR 경로는 null)
        Integer intervalWeeks,                       // 리밸런싱 주기 (주 단위, 1 이상, VR 전용)
        BigDecimal bandWidth,                         // 매수·매도 사다리 밴드 폭 (%, VR 전용)
        Integer recurringAmount,                      // 주기당 추가 예수금 (USD, 음수=인출, VR 전용)
        // VR 램프 파라미터 (미지정 시 서비스에서 정규화된 기본값 적용, VR 전용)
        Integer initialGradient,                      // 램프 시작 시점(경과 0주)의 gradient(G) 값
        Integer gGraceWeeks,                          // gradient 램프 시작 전 유예 주수
        Integer gStepWeeks,                           // gradient가 한 단계 상승하는 주기 (주 단위)
        Integer gMax,                                 // gradient 램프의 상한값
        BigDecimal initialPoolLimitRate,               // 램프 시작 시점(경과 0주)의 poolLimitRate 값
        Integer pGraceWeeks,                          // poolLimitRate 램프 시작 전 유예 주수
        Integer pStepWeeks,                           // poolLimitRate가 한 단계 하강하는 주기 (주 단위)
        BigDecimal poolLimitFloor,                     // poolLimitRate 램프의 하한값
        LocalDate scheduledStartDate,                  // 시작예정일 (null이면 오늘, 과거 거부)
        // VR: 초기 V값 직접 지정 (VR 전용, null/0 이하면 미지정 취급 — 평가금 기준으로 대체)
        BigDecimal initialVrValue
) {
    // 기존 19개 필드 호출부(테스트 등) 호환용 — initialVrValue 생략 시 null(미지정)
    public RegisterStrategyCommand(Strategy.Type type, Strategy.Ticker ticker, BigDecimal initialUsdDeposit,
            Strategy.CycleSeedType cycleSeedType, int divisionCount, Integer initialHoldings, BigDecimal initialAvgPrice,
            Integer intervalWeeks, BigDecimal bandWidth, Integer recurringAmount, Integer initialGradient,
            Integer gGraceWeeks, Integer gStepWeeks, Integer gMax, BigDecimal initialPoolLimitRate,
            Integer pGraceWeeks, Integer pStepWeeks, BigDecimal poolLimitFloor, LocalDate scheduledStartDate) {
        this(type, ticker, initialUsdDeposit, cycleSeedType, divisionCount, initialHoldings, initialAvgPrice,
                intervalWeeks, bandWidth, recurringAmount, initialGradient, gGraceWeeks, gStepWeeks, gMax,
                initialPoolLimitRate, pGraceWeeks, pStepWeeks, poolLimitFloor, scheduledStartDate, null);
    }
}
```

- [ ] **Step 2: 컴파일 확인**

Run: `cd "C:\Users\USER\workspace\kista\kista-api" && bash gradlew compileTestJava`
Expected: BUILD SUCCESSFUL (기존 34개 호출부는 19-인자 보조 생성자로 그대로 컴파일된다)

- [ ] **Step 3: 커밋**

```bash
cd "C:\Users\USER\workspace\kista\kista-api"
git add src/main/java/com/kista/adapter/in/web/dto/TradingCycleRequest.java \
        src/main/java/com/kista/domain/model/strategy/RegisterStrategyCommand.java \
        src/test/java/com/kista/adapter/in/web/dto/TradingCycleRequestTest.java
git commit -m "$(cat <<'EOF'
feat(strategy): VR 초기 V값 직접 입력 필드(initialVrValue) 추가

TradingCycleRequest/RegisterStrategyCommand에 필드를 추가하고, 기존
19-인자 호출부 호환을 위해 RegisterStrategyCommand에 보조 생성자를 둔다.
StrategyService 로직 연결은 다음 커밋에서 처리한다.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `StrategyService`에 V값 override 우선순위 로직 연결

**Files:**
- Modify: `C:\Users\USER\workspace\kista\kista-api\src\main\java\com\kista\application\service\strategy\StrategyService.java`

- [ ] **Step 1: `register()`에 override 해석·전달 로직 추가**

`register()` 메서드의 VR 분기(기존 73~80행 부근)를 다음으로 교체한다:

```java
        // VR 전략 파라미터 검증 (서비스 계층 — DTO @NotNull 없이 여기서 처리) — V값은 시장가×보유수량 기준
        // 램프 파라미터(gradient/poolLimitRate 경과주수 함수)는 RuntimeSettings 정책 밖 — 요청값 정규화 후 여기서 직접 검증
        VrRampParams ramp = null;
        BigDecimal vrValue = null;
        if (cmd.type() == Strategy.Type.VR) {
            int normalizedRecurringAmount = resolved.recurringAmount() != null ? resolved.recurringAmount() : 0;
            vrValue = resolveVrValue(cmd, initialStockValue);
            ramp = normalizeVrRampParams(cmd, normalizedRecurringAmount);
            validateVrCommand(cmd, resolved.intervalWeeks(), resolved.bandWidth(), resolved.recurringAmount(),
                    vrValue, initialStockValue, ramp);
        }
```

그리고 `saveInitialCycleAndPosition(...)` 호출부(기존 94~97행)를 다음으로 교체한다:

```java
        // 첫 번째 사이클·포지션 저장 (strategy_cycles → cycle_positions → 전략별 detail)
        InitialCycleResult initialResult = saveInitialCycleAndPosition(
                persisted.strategy(), persisted.version().id(), cmd.initialUsdDeposit(),
                initialHoldings, cmd.initialAvgPrice(), marketPrice, initialStockValue, vrValue,
                persisted.vrDetail(), scheduledStart);
```

- [ ] **Step 2: `resolveVrValue` 헬퍼 추가**

`validateBootstrapPosition` 메서드 바로 뒤(기존 125행 이후)에 추가한다:

```java
    // VR V값 우선순위 — 초기 V 직접 입력(>0)이 있으면 그 값을, 없으면 평가금(전일종가×보유수량)을 사용한다.
    // 실제 포지션(CyclePosition)·startAmount는 이 override와 무관하게 항상 evaluatedStockValue(실제 시장가) 기준을 유지한다.
    private BigDecimal resolveVrValue(RegisterStrategyCommand cmd, BigDecimal evaluatedStockValue) {
        BigDecimal explicit = cmd.initialVrValue();
        if (explicit != null && explicit.signum() < 0) {
            throw new IllegalArgumentException("VR 전략의 초기 V값(initialVrValue)은 0 이상이어야 합니다");
        }
        return explicit != null && explicit.signum() > 0 ? explicit : evaluatedStockValue;
    }
```

- [ ] **Step 3: `validateVrCommand` 시그니처·로직 변경**

기존 메서드(154~215행)를 다음으로 교체한다 — `initialValue` 파라미터를 `vrValue`(게이트 판정용, override 반영)와 `evaluatedStockValue`(인출식 최소자산 검증용, override 미반영) 두 개로 분리한다:

```java
    // VR 전용 파라미터 검증 — 각 항목이 null이거나 범위 위반이면 IllegalArgumentException
    // vrValue: register()에서 override 우선순위로 해석된 V값(게이트 판정용) — resolveVrValue() 참고
    // evaluatedStockValue: 실제 시장가 기준 평가금(전일종가×보유수량) — 인출식 최소자산 검증은 이 값만 사용해 override로 우회할 수 없게 한다
    private void validateVrCommand(RegisterStrategyCommand cmd, Integer intervalWeeks,
                                   BigDecimal bandWidth, Integer recurringAmount,
                                   BigDecimal vrValue, BigDecimal evaluatedStockValue,
                                   VrRampParams ramp) {
        if (intervalWeeks == null || intervalWeeks <= 0) {
            throw new IllegalArgumentException("VR 전략의 리밸런싱 주기(intervalWeeks)는 1 이상이어야 합니다");
        }
        if (bandWidth == null || bandWidth.signum() <= 0) {
            throw new IllegalArgumentException("VR 전략의 밴드 폭(bandWidth)은 0보다 커야 합니다");
        }
        BigDecimal initialUsdDeposit = normalizeMoney(cmd.initialUsdDeposit());
        int normalizedRecurringAmount = recurringAmount != null ? recurringAmount : 0;
        BigDecimal initialAssets = vrValue.add(initialUsdDeposit);

        if (normalizedRecurringAmount <= 0 && initialAssets.signum() <= 0) {
            throw new IllegalArgumentException("VR 거치식/인출식은 초기 V값과 초기 예수금 중 하나는 0보다 커야 합니다");
        }
        if (normalizedRecurringAmount < 0) {
            BigDecimal required = BigDecimal.valueOf(Math.abs((long) normalizedRecurringAmount))
                    .multiply(BigDecimal.valueOf(100))
                    .multiply(BigDecimal.valueOf(4))
                    .divide(BigDecimal.valueOf(intervalWeeks), 2, RoundingMode.HALF_UP);
            BigDecimal evaluatedAssets = evaluatedStockValue.add(initialUsdDeposit);
            if (evaluatedAssets.compareTo(required) < 0) {
                throw new IllegalArgumentException("인출식 VR 전략의 초기 자산은 " + required + " 이상이어야 합니다");
            }
        }

        // 램프 파라미터 검증 — 정규화된(null 아님) 값 기준
        if (ramp.initialGradient() <= 0) {
            throw new IllegalArgumentException("VR 전략의 초기 gradient(initialGradient)는 0보다 커야 합니다");
        }
        if (ramp.gStepWeeks() < 0) {
            throw new IllegalArgumentException("VR 전략의 gradient 스텝 주기(gStepWeeks)는 0 이상이어야 합니다");
        }
        if (ramp.gGraceWeeks() < 0) {
            throw new IllegalArgumentException("VR 전략의 gradient 유예 주수(gGraceWeeks)는 0 이상이어야 합니다");
        }
        // gStepWeeks=0은 gradient 램프 비활성화 — 이때 gMax는 계산에 사용되지 않으므로 0을 허용
        if (ramp.gStepWeeks() > 0 && ramp.gMax() < ramp.initialGradient()) {
            throw new IllegalArgumentException("VR 전략의 gradient 상한(gMax)은 initialGradient 이상이어야 합니다");
        }
        if (ramp.pStepWeeks() < 0) {
            throw new IllegalArgumentException("VR 전략의 poolLimitRate 스텝 주기(pStepWeeks)는 0 이상이어야 합니다");
        }
        if (ramp.pGraceWeeks() < 0) {
            throw new IllegalArgumentException("VR 전략의 poolLimitRate 유예 주수(pGraceWeeks)는 0 이상이어야 합니다");
        }
        if (ramp.initialPoolLimitRate().compareTo(BigDecimal.ONE) > 0) {
            throw new IllegalArgumentException("VR 전략의 초기 poolLimitRate(initialPoolLimitRate)는 1 이하여야 합니다");
        }
        // poolLimitFloor 범위는 pStepWeeks와 무관하게 항상 검증 — DB CHECK(pool_limit_floor <= initial_pool_limit_rate)와
        // 어긋나는 값이 여기서 걸러지지 않으면 INSERT 시 매핑되지 않은 DataIntegrityViolationException → 500으로 새는 것을 방지
        if (ramp.poolLimitFloor().signum() < 0 || ramp.poolLimitFloor().compareTo(ramp.initialPoolLimitRate()) > 0) {
            throw new IllegalArgumentException(
                    "VR 전략의 poolLimitRate 하한(poolLimitFloor)은 0 이상 initialPoolLimitRate 이하여야 합니다");
        }
        // pStepWeeks=0은 poolLimitRate 램프 비활성화(항상 initialPoolLimitRate 유지) — 이때는 poolLimitFloor=0도 허용
        if (ramp.pStepWeeks() > 0 && ramp.poolLimitFloor().signum() <= 0) {
            throw new IllegalArgumentException("VR 전략의 poolLimitRate 램프는 poolLimitFloor가 0보다 커야 합니다");
        }
    }
```

- [ ] **Step 4: `saveInitialCycleAndPosition` 시그니처·로직 변경**

기존 메서드(284~310행)를 다음으로 교체한다 — `vrValue` 파라미터를 추가해 VR 분기에서 `initialStockValue` 대신 `vrValue`를 저장하도록 한다:

```java
    // strategy_cycles → cycle_positions → 전략 타입별 cycle_detail 순 저장
    // startAmount = 현금 + 시장가×보유수량 — VR도 총 시작자산을 동일하게 보존한다(vrValue override와 무관).
    // vrValue: VR V값 저장용(override 우선순위 반영, resolveVrValue() 참고) — 비VR은 null
    private InitialCycleResult saveInitialCycleAndPosition(
            Strategy saved, UUID versionId, BigDecimal initialUsdDeposit,
            int initialHoldings, BigDecimal initialAvgPrice, BigDecimal marketPrice,
            BigDecimal initialStockValue, BigDecimal vrValue, StrategyVrDetail vrDetail, LocalDate scheduledStart) {
        BigDecimal normalizedInitialUsdDeposit = normalizeMoney(initialUsdDeposit);
        BigDecimal startAmount = normalizedInitialUsdDeposit.add(initialStockValue);
        StrategyCycle cycle = strategyCyclePort.save(StrategyCycle.start(saved.id(), versionId, startAmount, scheduledStart));

        CyclePosition initialPosition = initialHoldings > 0
                ? cyclePositionPort.save(CyclePosition.bootstrapSnapshot(
                        cycle.id(), normalizedInitialUsdDeposit, initialHoldings, initialAvgPrice, marketPrice))
                : cyclePositionPort.save(CyclePosition.initialSnapshot(cycle.id(), normalizedInitialUsdDeposit));

        if (saved.isInfinite()) {
            cyclePositionInfiniteDetailPort.save(new CyclePositionInfiniteDetail(initialPosition.id(), false));
            return new InitialCycleResult(cycle, initialPosition, null);
        } else if (saved.isVr()) {
            StrategyCycleVrDetail savedCycleVr = vrStrategyLifecycle.saveInitialCycleDetail(
                    cycle.id(), normalizedInitialUsdDeposit, vrValue, vrDetail);
            return new InitialCycleResult(cycle, initialPosition, savedCycleVr);
        } else {
            // PRIVACY
            return new InitialCycleResult(cycle, initialPosition, null);
        }
    }
```

- [ ] **Step 5: 컴파일 확인**

Run: `cd "C:\Users\USER\workspace\kista\kista-api" && bash gradlew compileJava compileTestJava`
Expected: BUILD SUCCESSFUL

---

### Task 4: `StrategyServiceTest`에 override 시나리오 테스트 추가

**Files:**
- Modify: `C:\Users\USER\workspace\kista\kista-api\src\test\java\com\kista\application\service\strategy\StrategyServiceTest.java`

기존 "VR register()" 섹션(680행 부근, `register_vr_success_savesVrDetailsAndPoolLimit` 앞)에 아래 4개 테스트를 추가한다. 20-인자 `RegisterStrategyCommand` 생성자를 사용해 `initialVrValue`를 마지막 인자로 명시한다.

- [ ] **Step 1: "홀딩스 없이도 초기 V 입력만으로 등록 가능" 테스트 추가**

```java
    @Test
    @DisplayName("VR register() holdings=0이어도 초기 V 입력이 있으면 그 값을 V값으로 저장한다")
    void register_vr_explicitInitialValue_holdingsZero_usesOverrideAsValue() {
        RegisterStrategyCommand cmd = new RegisterStrategyCommand(
                Strategy.Type.VR, null, BigDecimal.ZERO, null, 20,
                null, null, 2, new BigDecimal("15.00"), 0,
                null, null, null, null, null, null, null, null, null,
                new BigDecimal("5000"));
        Account account = ownerAccount();
        UUID vrStrategyId = UUID.randomUUID();
        UUID vrCycleId = UUID.randomUUID();
        Strategy savedVrStrategy = new Strategy(vrStrategyId, ACCOUNT_ID, Strategy.Type.VR,
                Strategy.Status.ACTIVE, Strategy.Ticker.TQQQ, Strategy.CycleSeedType.NONE);
        StrategyCycle savedCycle = new StrategyCycle(vrCycleId, vrStrategyId, STRATEGY_VERSION_ID,
                BigDecimal.ZERO, null, LocalDate.now(), null, null, null);
        CyclePosition savedPosition = new CyclePosition(UUID.randomUUID(), vrCycleId,
                BigDecimal.ZERO, null, null, 0, null, null);

        when(accountPort.requireOwnedAccount(ACCOUNT_ID, USER_ID)).thenReturn(account);
        when(strategyPort.existsByAccountIdAndTicker(ACCOUNT_ID, Strategy.Ticker.TQQQ)).thenReturn(false);
        when(userPort.findByIdOrThrow(USER_ID)).thenReturn(activeUser());
        when(userSettingsPort.findOrDefault(USER_ID)).thenReturn(UserSettings.defaultFor(USER_ID));
        when(strategyPort.save(any(Strategy.class))).thenReturn(savedVrStrategy);
        when(strategyCyclePort.save(any(StrategyCycle.class))).thenReturn(savedCycle);
        when(cyclePositionPort.save(any(CyclePosition.class))).thenReturn(savedPosition);
        when(strategyCycleVrPort.save(any(StrategyCycleVrDetail.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        strategyService.register(USER_ID, ACCOUNT_ID, cmd);

        // holdings=0이라 실제 포지션·startAmount는 그대로 0이지만, V값 저장은 override(5000)를 사용한다
        verify(strategyCycleVrPort).save(argThat(cv -> cv.value().compareTo(new BigDecimal("5000")) == 0));
        verify(strategyCyclePort).save(argThat(c -> c.startAmount().signum() == 0));
        verify(registry, never()).require(any(), eq(BrokerPricePort.class));
    }
```

- [ ] **Step 2: "실제 보유 포지션이 있어도 V값은 override를 사용하고 평가금·startAmount는 실제 시장가를 유지" 테스트 추가**

```java
    @Test
    @DisplayName("VR register() 초기 V 입력이 있어도 실제 포지션·startAmount는 시장가 평가금 기준을 그대로 유지한다")
    void register_vr_explicitInitialValue_withHoldings_keepsEvaluatedAssetsSeparate() {
        RegisterStrategyCommand cmd = new RegisterStrategyCommand(
                Strategy.Type.VR, null, BigDecimal.ZERO, null, 20,
                10, new BigDecimal("100.00"), 2, new BigDecimal("15.00"), 0,
                null, null, null, null, null, null, null, null, null,
                new BigDecimal("99999"));
        Account account = ownerAccount();
        UUID vrStrategyId = UUID.randomUUID();
        UUID vrCycleId = UUID.randomUUID();
        Strategy savedVrStrategy = new Strategy(vrStrategyId, ACCOUNT_ID, Strategy.Type.VR,
                Strategy.Status.ACTIVE, Strategy.Ticker.TQQQ, Strategy.CycleSeedType.NONE);

        when(accountPort.requireOwnedAccount(ACCOUNT_ID, USER_ID)).thenReturn(account);
        when(strategyPort.existsByAccountIdAndTicker(ACCOUNT_ID, Strategy.Ticker.TQQQ)).thenReturn(false);
        when(userPort.findByIdOrThrow(USER_ID)).thenReturn(activeUser());
        when(userSettingsPort.findOrDefault(USER_ID)).thenReturn(UserSettings.defaultFor(USER_ID));
        when(registry.require(account, BrokerPricePort.class)).thenReturn(brokerPricePort);
        when(brokerPricePort.getPrevClose(Strategy.Ticker.TQQQ, account)).thenReturn(new BigDecimal("50.00"));
        when(strategyPort.save(any(Strategy.class))).thenReturn(savedVrStrategy);
        when(strategyCyclePort.save(any(StrategyCycle.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(cyclePositionPort.save(any(CyclePosition.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(strategyCycleVrPort.save(any(StrategyCycleVrDetail.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        strategyService.register(USER_ID, ACCOUNT_ID, cmd);

        // V값은 override(99999) 저장
        verify(strategyCycleVrPort).save(argThat(cv -> cv.value().compareTo(new BigDecimal("99999")) == 0));
        // 실제 포지션(holdings=10, avgPrice=100)과 startAmount(전일종가 50×10=500.00)는 override와 무관
        verify(cyclePositionPort).save(argThat(p ->
                p.holdings() == 10 && p.avgPrice().compareTo(new BigDecimal("100.00")) == 0));
        verify(strategyCyclePort).save(argThat(c -> c.startAmount().compareTo(new BigDecimal("500.00")) == 0));
    }
```

- [ ] **Step 3: "인출식 최소자산 검증은 override를 반영하지 않는다" 테스트 추가**

```java
    @Test
    @DisplayName("VR register() 인출식 최소자산 검증은 초기 V 입력을 반영하지 않고 실제 평가금 기준으로만 판단한다")
    void register_vr_explicitInitialValue_doesNotBypassWithdrawalMinimumCheck() {
        // 게이트(V+예수금>0)는 override(100000)로 통과하지만, 인출식 최소자산(실제 평가금 0 + 예수금 100)은 미달
        RegisterStrategyCommand cmd = new RegisterStrategyCommand(
                Strategy.Type.VR, null, new BigDecimal("100"), null, 20,
                null, null, 2, new BigDecimal("15.00"), -100,
                null, null, null, null, null, null, null, null, null,
                new BigDecimal("100000"));
        Account account = ownerAccount();

        when(accountPort.requireOwnedAccount(ACCOUNT_ID, USER_ID)).thenReturn(account);
        when(userPort.findByIdOrThrow(USER_ID)).thenReturn(activeUser());
        when(userSettingsPort.findOrDefault(USER_ID)).thenReturn(UserSettings.defaultFor(USER_ID));
        when(registry.require(account, MarginPort.class)).thenReturn(marginPort);
        when(marginPort.getUsdBuyableAmount(account)).thenReturn(new BigDecimal("5000"));
        when(strategyPort.findByAccountId(ACCOUNT_ID)).thenReturn(List.of());

        assertThatThrownBy(() -> strategyService.register(USER_ID, ACCOUNT_ID, cmd))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("인출식 VR 전략의 초기 자산");
    }
```

- [ ] **Step 4: "음수 초기 V 거부" 테스트 추가**

```java
    @Test
    @DisplayName("VR register() 초기 V값이 음수이면 IllegalArgumentException")
    void register_vr_negativeInitialValue_throws() {
        RegisterStrategyCommand cmd = new RegisterStrategyCommand(
                Strategy.Type.VR, null, null, null, 20,
                null, null, 2, new BigDecimal("15.00"), 0,
                null, null, null, null, null, null, null, null, null,
                new BigDecimal("-1"));
        Account account = ownerAccount();

        when(accountPort.requireOwnedAccount(ACCOUNT_ID, USER_ID)).thenReturn(account);
        when(strategyPort.existsByAccountIdAndTicker(ACCOUNT_ID, Strategy.Ticker.TQQQ)).thenReturn(false);
        when(userPort.findByIdOrThrow(USER_ID)).thenReturn(activeUser());
        when(userSettingsPort.findOrDefault(USER_ID)).thenReturn(UserSettings.defaultFor(USER_ID));

        assertThatThrownBy(() -> strategyService.register(USER_ID, ACCOUNT_ID, cmd))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("초기 V값(initialVrValue)은 0 이상이어야 합니다");
    }
```

- [ ] **Step 5: 테스트 실행**

Run: `cd "C:\Users\USER\workspace\kista\kista-api" && bash gradlew test --tests "com.kista.application.service.strategy.StrategyServiceTest" --tests "com.kista.adapter.in.web.dto.TradingCycleRequestTest"`
Expected: BUILD SUCCESSFUL, 신규 4 + 기존 2건 모두 PASS

- [ ] **Step 6: 커밋**

```bash
cd "C:\Users\USER\workspace\kista\kista-api"
git add src/main/java/com/kista/application/service/strategy/StrategyService.java \
        src/test/java/com/kista/application/service/strategy/StrategyServiceTest.java
git commit -m "$(cat <<'EOF'
feat(strategy): VR 초기 V값 override 우선순위를 StrategyService에 연결

초기 V 입력이 있으면 게이트 판정·V값 저장에 우선 사용하되, 실제 포지션·
startAmount·인출식 최소자산 검증은 항상 실제 시장가 평가금 기준을 유지해
override로 회계나 안전장치를 우회할 수 없도록 한다.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Frontend (kista-ui)

### Task 5: `StrategyRequest` 타입에 `initialVrValue` 추가

**Files:**
- Modify: `C:\Users\USER\workspace\kista\kista-ui\entities\strategy\model\types.ts`

`StrategyRequest`는 `shared/lib/api-types.ts`(자동 생성, 직접 수정 금지)를 참조하지 않는 수기 관리 인터페이스다. `recurringAmount` 필드 바로 아래에 추가한다.

- [ ] **Step 1: 필드 추가**

```ts
export interface StrategyRequest {
  type: string
  ticker?: string
  cycleSeedType: CycleSeedType
  initialUsdDeposit?: number  // 등록 시 또는 holdings=0 수정 시 전송
  divisionCount?: number      // 분할 수 (20/30/40, 미전송 시 백엔드 기본값 20)
  initialHoldings?: number    // 중간부터 시작 — 등록 시점 기존 보유 수량 (세 전략 공통, 등록 전용, null/0이면 빈 포지션)
  initialAvgPrice?: number    // 중간부터 시작 — 등록 시점 기존 평단가 (initialHoldings>0이면 필수)
  intervalWeeks?: number      // VR 전용: 롤오버 주기 (주)
  bandWidth?: number          // VR 전용: 밴드 폭 (%)
  recurringAmount?: number    // VR 전용: 정기 입출금 (USD)
  initialVrValue?: number     // VR 전용: 초기 V값 직접 지정 (등록 전용, 없으면 평가금 기준으로 서버가 계산)
  initialGradient?: number       // VR 전용: 램프 시작(경과 0주) G값
  ...
```

(나머지 필드는 그대로 둔다.)

- [ ] **Step 2: 타입체크**

Run: `cd "C:\Users\USER\workspace\kista\kista-ui" && npm run typecheck`
Expected: 에러 없음 (이 단계에서는 아직 아무도 `initialVrValue`를 채우지 않으므로 신규 에러가 없어야 정상)

---

### Task 6: `strategyFormSchema`에 `initialValue` 추가

**Files:**
- Modify: `C:\Users\USER\workspace\kista\kista-ui\features\strategy\create-strategy\model\strategyFormSchema.ts`

- [ ] **Step 1: 필드 추가**

`recurringAmount` 필드 바로 아래에 추가한다:

```ts
  recurringAmount: z.number().int().nonnegative().nullable().optional(),
  recurringMode: z.enum(['DEPOSIT', 'HOLD', 'WITHDRAW']),
  initialValue: z.number().nonnegative().nullable().optional(),
  scheduledStartDate: z.string().nullable().optional(),
```

- [ ] **Step 2: 타입체크**

Run: `cd "C:\Users\USER\workspace\kista\kista-ui" && npm run typecheck`
Expected: 에러 없음

---

### Task 7: `useStrategyForm`에 `initialValue` 필드 연결

**Files:**
- Modify: `C:\Users\USER\workspace\kista\kista-ui\features\strategy\create-strategy\model\useStrategyForm.ts`

- [ ] **Step 1: `VrFields`에 필드 추가**

```ts
export interface VrFields {
  avgPrice: number | null
  quantity: number | null
  intervalWeeks: number | null
  bandWidth: number | null
  recurringAmount: number | null
  initialValue: number | null
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

- [ ] **Step 2: `defaultValues`에 초기값 추가**

`recurringAmount` 라인 바로 아래(기존 154행 부근)에 추가:

```ts
      recurringAmount: Math.abs(initial?.vr?.recurringAmount ?? 0),
      recurringMode: initial?.vr?.recurringAmount
        ? initial.vr.recurringAmount < 0 ? 'WITHDRAW' : 'DEPOSIT'
        : 'HOLD',
      initialValue: null,
```

(등록 전용 필드이므로 `initial`이 있어도 항상 `null` — `avgPrice`/`quantity`와 동일한 패턴.)

- [ ] **Step 3: watch 추가 + `vrFields` 조립에 포함**

기존 `recurringAmount` watch 라인 아래(189행 부근)에 추가:

```ts
  const recurringAmount = form.watch('recurringAmount') ?? null
  const recurringMode = form.watch('recurringMode')
  const initialValue = form.watch('initialValue') ?? null
```

`vrFields` 객체 조립(201~205행)을 다음으로 교체:

```ts
  const vrFields: VrFields = {
    avgPrice, quantity, intervalWeeks, bandWidth, recurringAmount, initialValue,
    initialGradient, gGraceWeeks, gStepWeeks, gMax,
    initialPoolLimitRate, pGraceWeeks, pStepWeeks, poolLimitFloor,
  }
```

- [ ] **Step 4: 인출식 사전검증용 `normalizedInitialValue`에 override 우선순위 반영**

기존(317~319행):

```ts
  const normalizedInitialValue = initial
    ? initial.vr?.value ?? 0
    : (avgPrice ?? 0) * (quantity ?? 0)
```

를 다음으로 교체:

```ts
  // VR 게이트 판정용 추정 V값 — 초기 V 입력이 있으면 우선 사용, 없으면 기존처럼 평단가×수량 추정치
  // (인출식 최소자산 검증은 서버가 항상 실제 평가금 기준으로만 계산하므로 override가 있어도 서버가 최종 거부할 수 있음)
  const normalizedInitialValue = initial
    ? initial.vr?.value ?? 0
    : (initialValue ?? (avgPrice ?? 0) * (quantity ?? 0))
```

- [ ] **Step 5: `setVrField` 개별 setter는 이미 `keyof VrFields` 제네릭이라 수정 불필요**

`setVrField('initialValue', value)` 호출이 타입 체크를 통과하는지만 확인한다(485~487행의 기존 `setVrField` 함수는 변경 없음).

- [ ] **Step 6: payload에 `initialVrValue` 추가**

`handleSubmit`의 create 분기 중 `isVr` 블록(기존 528~545행)에서 `recurringAmount: normalizedRecurringAmount,` 바로 아래에 추가:

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
              // 초기 V 직접 입력 — 있으면 전송, 없으면 생략(서버가 평가금 기준으로 계산)
              ...(initialValue !== null && initialValue > 0 ? { initialVrValue: initialValue } : {}),
              // 램프 파라미터 — 값이 있을 때만 포함(생략 시 서버 기본값 적용)
              ...(initialGradient !== null ? { initialGradient } : {}),
```

- [ ] **Step 7: 타입체크**

Run: `cd "C:\Users\USER\workspace\kista\kista-ui" && npm run typecheck`
Expected: 에러 없음

---

### Task 8: `VrSettingsSection`에 "초기 V" 입력 UI 추가

**Files:**
- Modify: `C:\Users\USER\workspace\kista\kista-ui\features\strategy\create-strategy\sections\VrSettingsSection.tsx`

- [ ] **Step 1: "고급 설정" 첫 항목으로 UnitInput 추가**

기존 고급 설정 블록(136~174행) 중 밴드 폭 앞에 추가:

```tsx
      {!isEdit && (
        <details className="mt-4 group">
          <summary className="cursor-pointer select-none text-sm font-bold text-muted-foreground list-none flex items-center gap-1.5">
            <span className="transition-transform group-open:rotate-90">▸</span>
            고급 설정
          </summary>
          <div className="grid grid-cols-1 gap-y-5 mt-4">
            <label>
              <span className={FIELD_LABEL_CLASS}>초기 V</span>
              <UnitInput
                value={fields.initialValue}
                onChange={(v) => setField('initialValue', v)}
                unit="USD"
                disabled={disabled}
                placeholder="평가금 사용"
                maxDecimals={2}
              />
            </label>
            <div>
              <span className={FIELD_LABEL_CLASS}>밴드 폭</span>
```

`</div>` 로 끝나는 기존 밴드 폭·리밸런싱 주기 `<div className="grid grid-cols-1 gap-y-5 mt-4">...</div>` 블록의 시작 부분만 위와 같이 감싸면 되고, 나머지 내용(밴드 폭 버튼, 리밸런싱 주기 버튼, 닫는 태그)은 그대로 유지한다.

- [ ] **Step 2: 타입체크 + 개발 서버로 렌더 확인**

Run: `cd "C:\Users\USER\workspace\kista\kista-ui" && npm run typecheck`
Expected: 에러 없음

---

### Task 9: `VrSettingsSection.test.tsx` 갱신

**Files:**
- Modify: `C:\Users\USER\workspace\kista\kista-ui\features\strategy\create-strategy\sections\VrSettingsSection.test.tsx`

- [ ] **Step 1: `baseFields`에 `initialValue: null` 추가**

```ts
  const baseFields: VrFields = {
    avgPrice: null,
    quantity: null,
    intervalWeeks: 2,
    bandWidth: 15,
    recurringAmount: 0,
    initialValue: null,
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

- [ ] **Step 2: 신규 필드 테스트 추가**

`describe('advanced ramp settings (registration only)')` 블록 안, 첫 `it` 바로 뒤에 추가:

```ts
    it('renders and updates the explicit initial V input', () => {
      render(<VrSettingsSection fields={baseFields} {...baseProps} isEdit={false} />)
      const input = getInputByLabelText('초기 V')
      fireEvent.change(input, { target: { value: '5000' } })
      expect(mockSetField).toHaveBeenCalledWith('initialValue', 5000)
    })

    it('does not render the explicit initial V input in edit mode', () => {
      render(<VrSettingsSection fields={baseFields} {...baseProps} isEdit={true} initialVrValue={3000} />)
      expect(screen.queryByText('초기 V')).not.toBeInTheDocument()
    })
```

- [ ] **Step 3: 테스트 실행**

Run: `cd "C:\Users\USER\workspace\kista\kista-ui" && npx vitest run features/strategy/create-strategy/sections/VrSettingsSection.test.tsx`
Expected: 모든 테스트 PASS (기존 22건 + 신규 2건)

---

### Task 10: `useStrategyForm.test.ts` 갱신

**Files:**
- Modify: `C:\Users\USER\workspace\kista\kista-ui\features\strategy\create-strategy\model\useStrategyForm.test.ts`

- [ ] **Step 1: payload에 `initialVrValue`가 포함되는지 검증하는 테스트 추가**

기존 `'VR create payload includes VR fields and forces cycleSeedType NONE'` 테스트 바로 뒤에 추가:

```ts
  it('VR create payload includes initialVrValue when explicit initial V is entered', async () => {
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
      result.current.setVrField('recurringAmount', null)
      result.current.setVrField('initialValue', 5000)
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
      intervalWeeks: 4,
      bandWidth: 15,
      recurringAmount: 0,
      initialVrValue: 5000,
    })
  })

  it('VR create omits initialVrValue when the explicit initial V is left empty', async () => {
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
      result.current.setVrField('recurringAmount', null)
    })

    await act(async () => {
      result.current.handleSubmit({ preventDefault() {} } as React.FormEvent)
    })

    await waitFor(() => {
      expect(mockCreateMutate).toHaveBeenCalled()
    })

    expect(mockCreateMutate.mock.calls[0][0]).not.toHaveProperty('initialVrValue')
  })
```

- [ ] **Step 2: 게이트 판정에 override가 우선 반영되는지 검증하는 테스트 추가**

기존 `'VR withdrawal create requires initial assets to be at least 100 months of withdrawals'` 테스트 뒤에 추가 — 평단가·수량 없이 초기 V 입력만으로 거치식 게이트를 통과하는지 확인한다:

```ts
  it('VR create HOLD mode is allowed when only the explicit initial V is entered (no holdings)', () => {
    const { result } = renderHook(() =>
      useStrategyForm({
        accountId: 'account-1',
      }),
    )

    act(() => {
      result.current.setType('VR')
      result.current.setVrField('intervalWeeks', 2)
      result.current.setVrField('bandWidth', 15)
      result.current.setVrField('recurringAmount', 0)
      result.current.setRecurringMode('HOLD')
      result.current.setVrField('initialValue', 3000)
    })

    expect(result.current.cannotSubmit).toBe(false)
  })
```

- [ ] **Step 3: 테스트 실행**

Run: `cd "C:\Users\USER\workspace\kista\kista-ui" && npx vitest run features/strategy/create-strategy/model/useStrategyForm.test.ts`
Expected: 모든 테스트 PASS (기존 + 신규 3건)

- [ ] **Step 4: 전체 타입체크 + 전체 테스트**

Run: `cd "C:\Users\USER\workspace\kista\kista-ui" && npm run typecheck && npm run test:run`
Expected: 에러/실패 없음

- [ ] **Step 5: 커밋**

```bash
cd "C:\Users\USER\workspace\kista\kista-ui"
git add entities/strategy/model/types.ts \
        features/strategy/create-strategy/model/strategyFormSchema.ts \
        features/strategy/create-strategy/model/useStrategyForm.ts \
        features/strategy/create-strategy/model/useStrategyForm.test.ts \
        features/strategy/create-strategy/sections/VrSettingsSection.tsx \
        features/strategy/create-strategy/sections/VrSettingsSection.test.tsx
git commit -m "$(cat <<'EOF'
feat(strategy-form): VR 등록 고급 설정에 초기 V 직접 입력 추가

초기 V를 입력하면 payload에 initialVrValue로 전송해 서버가 평가금 계산
대신 이 값을 V값으로 저장하도록 한다. 미입력 시 기존처럼 평단가×수량
추정치/생략 동작을 유지한다.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review 체크리스트 (구현자용)

- [ ] 스펙의 세 가지 우선순위(override → 평가금 → 첫 매수 후 산정)가 백엔드(`resolveVrValue`)와 프론트(`normalizedInitialValue`/payload 조건부 전송) 양쪽에 모두 반영됐는지 확인
- [ ] 인출식 최소자산 검증(`evaluatedAssets`)이 override를 절대 참조하지 않는지 `validateVrCommand` 재확인
- [ ] `RegisterStrategyCommand`의 기존 34개 호출부가 전부 19-인자 보조 생성자로 컴파일되는지 `bash gradlew compileTestJava`로 확인 (에러 나면 해당 호출부를 찾아 20번째 인자를 붙이지 말고, 왜 보조 생성자가 매칭되지 않는지 먼저 확인)
- [ ] 프론트 `VrSettingsSection`에서 "초기 V"(신규, 등록 전용 입력)와 "초기 V값"(기존, 수정 전용 읽기전용 표시)이 라벨 텍스트로 구분되는지 확인
