# 전략 수정 시 시드 조건부 수정 허용 설계

## 변경 목적

전략 수정에서 시드(`initialUsdDeposit`)는 기본적으로 수정 불가로 유지한다.
단, 최신 포지션의 `holdings === 0`이면 아직 첫 매매 전인 사이클 시작점이므로 시드 수정을 허용한다.

이번 변경은 INFINITE / PRIVACY 구분 없이 동일하게 적용한다.

## 정책

### 1. 전략 수정 허용 기준
- `holdings > 0`이면 시드 수정 불가
- `holdings === 0`이면 시드 수정 가능
- `cycleSeedType` 변경은 기존처럼 항상 허용

### 2. 의미 해석
- `holdings === 0`은 현재 사이클이 새로 시작됐고 아직 첫 매매가 이뤄지지 않은 상태다.
- 이 시점의 시드 수정은 "기존 포지션 변경"이 아니라 "사이클 시작점 보정"으로 본다.
- 따라서 최신 시작점 데이터인 `strategy_cycle.start_amount`와 `cycle_position`을 함께 갱신한다.

## UI 요구사항

### 1. 수정 화면
- 기본적으로 수정 화면은 읽기 전용 시작금액 UI를 보여준다.
- 단, 서버가 내려준 현재 holdings가 `0`이면 등록 화면과 동일한 시드 입력 UI를 그대로 노출한다.
- 이때 보조 문구는 "첫 매매 전이라 시드 수정이 가능합니다"처럼 허용 이유를 명확히 보여준다.

### 2. holdings > 0
- 기존 정책을 유지한다.
- 시작금액은 읽기 전용으로만 보이고, 저장 payload에 `initialUsdDeposit`를 포함하지 않는다.

### 3. holdings === 0
- 등록 화면과 동일한 시드 입력 플로우를 사용한다.
- 잔고검증 ON/OFF, 최소 시드, 기준가 계산 흐름도 등록 화면과 동일하게 적용한다.
- 저장 시 `initialUsdDeposit`를 포함할 수 있다.

## API 요구사항

### 1. 프론트 판정 기준
- 프론트는 별도 추론을 하지 않고 서버 응답으로 현재 holdings를 받는다.
- 이 값으로 수정 화면의 시드 입력 가능 여부를 결정한다.

권장 응답 방식:
- 전략 상세/수정 진입에 필요한 응답에 `currentHoldings` 또는 동등한 필드를 추가
- 프론트는 `currentHoldings === 0`이면 editable, 아니면 read-only

### 2. 수정 API 검증
- `PUT /api/trading-cycles/{id}`에서 `newSeed`가 들어오면 서버가 최신 `cycle_position.holdings`를 다시 확인한다.
- `holdings > 0`이면 `IllegalArgumentException` 등 400 계열로 거절한다.
- 프론트는 UX를 위해 미리 막지만, 최종 정책 강제는 서버가 담당한다.

### 3. strategy_cycle / cycle_position 동시 갱신
- `holdings === 0`일 때 시드 수정이 허용되면:
  - `strategy_cycle.start_amount`를 새 시드로 갱신
  - 최신 `cycle_position` 시작점 행도 새 시드 기준으로 갱신

이번 정책에서는 최신 `cycle_position` 행을 직접 갱신한다.
새 스냅샷 append는 하지 않는다.

이유:
- 아직 첫 매매 전 시작점 보정이라 포지션 이력을 늘릴 의미가 없다.
- 같은 사이클의 시작점 메타를 정정하는 동작이므로 in-place update가 더 자연스럽다.

## 백엔드 변경 범위

### 1. `kista-api` 전략 수정 서비스
- 현재 `StrategyService.update()` / `updateSeed()` 흐름에 holdings gate를 추가한다.
- `newSeed`가 왔을 때 최신 `cycle_position`을 조회해 `holdings === 0`인지 확인한다.
- 아니라면 수정 거절

### 2. `StrategyCyclePort`
- 기존 `updateStartAmount()`는 유지한다.
- 최신 cycle_position 시작점 행을 직접 갱신하는 포트/어댑터 경로를 추가한다.

### 3. `CyclePositionPort`
- 최신 strategy 기준 포지션 한 건을 수정할 수 있는 업데이트 경로가 필요하다.
- append 전용 `save()`로 우회하지 말고, 최신 시작점 행 직접 갱신을 명시적으로 지원한다.

### 4. 응답 DTO
- 프론트가 수정 가능 여부를 안정적으로 판단할 수 있도록 holdings 값을 내려주는 DTO 필드 추가가 필요하다.
- TradingCycle 상세 응답 또는 수정 화면 초기 데이터에 포함되면 된다.

## 프론트 변경 범위

### 1. `StrategyFormDialog` / `StrategyForm`
- 수정 모드에서 `currentHoldings === 0`이면 등록 화면과 동일한 `UsageRatioSection`을 노출한다.
- `currentHoldings > 0`이면 현재의 읽기 전용 `ReadOnlySeedSection`을 유지한다.

### 2. `useStrategyForm`
- 수정 모드라도 `currentHoldings === 0`이면 `initialUsdDeposit` 제출을 허용한다.
- 수정 모드의 submit payload는 아래처럼 분기한다:
  - `holdings > 0`: `initialUsdDeposit` 제외
  - `holdings === 0`: `initialUsdDeposit` 포함 가능

### 3. 시드 모델
- 수정 모드 전체를 읽기 전용으로 단순화했던 현재 로직은 다시 분기해야 한다.
- 단, editable edit는 `holdings === 0` 한정이므로 무제한 복구가 아니라 조건부 복구로 구현한다.

### 4. 전략 상세 페이지 데이터
- 수정 버튼을 여는 페이지/컴포넌트가 현재 holdings를 함께 알고 있어야 한다.
- 이미 `preview.position.holdings`가 존재하지만, 수정 가능 여부 SSOT는 수정 API와 같은 서버 기준 응답으로 맞춘다.

## 데이터 흐름

### 전략 수정, holdings > 0
1. 상세 진입
2. 서버가 currentHoldings > 0 응답
3. 수정 다이얼로그는 읽기 전용 시작금액 표시
4. 저장 시 `cycleSeedType`만 수정

### 전략 수정, holdings === 0
1. 상세 진입
2. 서버가 currentHoldings = 0 응답
3. 수정 다이얼로그는 등록 화면과 같은 시드 입력 UI 표시
4. 저장 시 `initialUsdDeposit` + `cycleSeedType` 제출 가능
5. API가 `strategy_cycle.start_amount`와 최신 `cycle_position` 시작점 행을 함께 갱신

## 검증 포인트

### 프론트
- holdings > 0이면 수정 화면에서 시드 입력 UI가 보이지 않는지
- holdings === 0이면 수정 화면에서 등록과 동일한 시드 입력 UI가 보이는지
- holdings === 0인 수정 저장 시 `initialUsdDeposit`가 payload에 포함되는지

### 백엔드
- holdings > 0 상태의 `newSeed` 수정 요청이 400으로 거절되는지
- holdings === 0 상태의 `newSeed` 수정 요청이 성공하는지
- 성공 시 `strategy_cycle.start_amount`와 최신 `cycle_position` 값이 함께 갱신되는지
- INFINITE / PRIVACY 모두 동일 정책으로 동작하는지

## 영향 범위

- 기존 "전략 수정은 항상 시드 불가" 정책 문서와 주석은 모두 갱신 대상
- 전략 상세 KPI, 시드 배지, 신규 등록 플로우 자체는 유지
- `preview.position.holdings`는 이미 존재하지만, 수정 가능 여부의 최종 SSOT는 서버 검증 규칙이다
