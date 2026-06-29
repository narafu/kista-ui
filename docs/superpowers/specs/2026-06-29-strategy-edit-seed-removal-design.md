# 전략 수정 시 시드 변경 제거 설계

## 변경 목적

전략 수정 화면에서는 `initialUsdDeposit`를 더 이상 수정하지 않는다.
사용자는 전략의 연속 여부(`cycleSeedType`)만 변경할 수 있고, 시작금액은 읽기 전용 정보로만 확인한다.

배경:
- 현재 `create-strategy` 슬라이스가 신규 등록과 전략 수정을 같은 폼으로 처리한다.
- 수정 모드에서도 시드 입력을 열어 두어 `initialUsdDeposit` 변경이 가능하다.
- 최근 수정 커밋(`5162209`)도 이 수정 모드 시드 UX를 보정한 것이어서, 정책 변경 시 관련 분기 자체를 줄이는 편이 맞다.

## 요구사항

### 1. 전략 수정 정책
- 전략 수정에서는 `initialUsdDeposit`를 변경할 수 없다.
- 전략 수정에서는 `cycleSeedType` 변경은 계속 허용한다.
- 전략 등록에서는 기존 시드 입력 흐름을 유지한다.

### 2. 수정 모드 UI
- 수정 다이얼로그에서 시드 입력 UI는 제거한다.
- 대신 현재 시작금액을 읽기 전용으로 노출한다.
- 보조 문구로 "시드는 전략 등록 후 수정할 수 없습니다"를 명시한다.
- 시작금액이 없는 전략이면 `미설정`으로 표시한다.

### 3. API payload
- 수정 모드 `PUT /api/trading-cycles/{id}` payload에는 `initialUsdDeposit`를 포함하지 않는다.
- 수정 모드 payload는 현재와 같이 `cycleSeedType` 중심으로 구성한다.
- 등록 모드 `POST /api/accounts/{accountId}/trading-cycles` payload는 변경하지 않는다.

## 변경 범위

### 1. `features/strategy/create-strategy/StrategyForm.tsx`
- 수정 모드일 때 시드 입력 섹션을 렌더하지 않도록 분기한다.
- 읽기 전용 시작금액 표시 블록을 별도로 렌더한다.
- 신규 등록 모드에서는 기존 `UsageRatioSection` 렌더를 유지한다.

### 2. `features/strategy/create-strategy/model/useStrategyForm.ts`
- 수정 모드 submit payload에서 `initialUsdDeposit`를 완전히 제거한다.
- `cannotSubmit` 계산이 수정 모드에서 시드 유효성에 묶이지 않도록 분리한다.
- 등록 모드에서만 시드 preview, 최소 시드 검증, 시드 dirty 상태가 제출 가능 여부에 영향을 주게 정리한다.

### 3. `features/strategy/create-strategy/model/useSeedModel.ts`
- 수정 모드 전용 상태(`seedUsdInput`, `isDirty`)가 더 이상 필요 없도록 단순화한다.
- 최소 범위 접근이면 수정 모드 분기를 제거하고 등록 전용 시드 모델로 축소한다.
- 공용 훅을 유지하더라도 수정 모드 상태가 payload와 validation에 관여하지 않도록 정리한다.

### 4. `features/strategy/create-strategy/sections/UsageRatioSection.tsx`
- 역할을 등록 전용 시드 입력 섹션으로 명확히 한다.
- `isEdit` 분기와 수정 모드용 hint 문구를 제거한다.
- 잔고검증 OFF / ON 등록 플로우는 그대로 유지한다.

## 권장 접근

권장안은 "수정 모드 읽기 전용 표시 + payload 제거"다.

이 접근을 권장하는 이유:
- 사용자가 바꿀 수 없는 값을 입력폼으로 보여 주지 않아 정책이 명확하다.
- 저장 시 무시하는 방식보다 UX 오해가 적다.
- 최근 추가된 수정 모드 시드 계산/동기화 분기를 되돌려 복잡도를 줄일 수 있다.
- 전략 상세 화면의 `시작금액` KPI가 이미 있어, 수정 다이얼로그에서도 같은 값을 정보성으로만 보여 주면 일관성이 유지된다.

## 데이터 흐름

### 전략 등록
- 사용자는 기존과 동일하게 퍼센트 게이지 또는 직접 USD 입력으로 시드를 정한다.
- `initialUsdDeposit`는 등록 payload에 포함된다.
- 최소 시드, 예수금, 기준가 검증도 기존과 동일하게 유지된다.

### 전략 수정
- 사용자는 현재 시작금액만 본다.
- 사용자는 자동 시작 여부와 시드 모드(`KEEP` / `MAX`)만 조정한다.
- 저장 시 `cycleSeedType`만 전송하고, `initialUsdDeposit`는 전송하지 않는다.

## 에러 처리와 회귀 포인트

- 수정 모드에서는 시드 preview 실패가 제출 차단 사유가 되지 않도록 해야 한다.
- 등록 모드에서는 현재의 최소 시드 경고와 제출 차단이 유지되어야 한다.
- 전략에 `initialUsdDeposit`가 없는 과거 데이터도 있으므로, 수정 UI의 읽기 전용 영역은 `미설정` 케이스를 안전하게 처리해야 한다.

## 테스트 관점

### 필요한 확인
- 전략 등록: 시드 입력과 최소 시드 검증이 기존대로 동작하는지
- 전략 수정: 시드 입력 UI가 사라지고 현재 시작금액만 보이는지
- 전략 수정 저장: `initialUsdDeposit` 없이도 `cycleSeedType` 변경이 정상 저장되는지
- 시드 미설정 전략 수정: 읽기 전용 영역이 `미설정`으로 안정적으로 보이는지

### 테스트 수준
- 최소한 form/model 단의 payload 분기 테스트 추가가 필요하다.
- UI 테스트가 없다면 수동 확인 항목으로 전략 등록/수정 각 1회씩 검증한다.

## 영향 없는 영역

- 전략 상세 페이지의 시작금액 KPI
- 전략 카드/상세의 시드 배지 표시
- 등록 시 strategy seed preview API 사용 방식
- `divisionCount`, `ticker`, `type` 등 수정 제한/허용 정책의 현재 동작
