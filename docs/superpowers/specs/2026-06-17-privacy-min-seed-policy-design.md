# PRIVACY 전략 최소 시드 정책 설계

## 변경 목적

PRIVACY 전략 등록 시 최소 시드 기준을 `currentCycleStart`에서 `currentCycleStart / 2`로 완화.
함께 발견된 OFF 모드 UX 버그(SeedAmountInput minSeed 미전달) 수정.

## 변경 범위

### 1. `entities/strategy/model/min-seed.ts`
- PRIVACY 최소 시드: `basePrice` → `basePrice / 2`
- 근거: multiple ≥ 0.5에서도 의미 있는 매매 가능

### 2. `features/strategy/create-strategy/sections/UsageRatioSection.tsx`
- OFF 모드 `SeedAmountInput`에 `minSeed={null}` 하드코딩 → `minSeed={minSeed}` 수정
- 효과: ± 버튼 활성화(step=minSeed), 입력창 내부 "최소 시드 미달" 표시 복구
- 중복 외부 경고 블록(isOff && isBelowMinSeed) 제거

### 3. `entities/strategy/model/min-seed.test.ts`
- PRIVACY 기대값 `25.0` → `12.5` (25.0 / 2)
- 테스트 설명 업데이트

## 영향 없는 영역

- 백엔드 `PrivacyCycleOrderStrategy.minRequiredDeposit()` — 사이클 재등록 기준, 별도 정책
- ON 모드(PercentGauge) 흐름 — 변경 없음
- INFINITE 전략 — 변경 없음
