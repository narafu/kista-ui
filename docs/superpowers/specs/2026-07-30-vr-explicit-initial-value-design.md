# VR 초기 V값 직접 입력 (프론트엔드) 설계

## 배경

VR 전략 등록 시 초기 V값(리밸런싱 기준선)은 지금까지 평단가·수량(중간부터 시작 공통 입력)을 통한 평가금으로만 결정할 수 있었다. kista-api에 `initialVrValue` 필드가 추가되어(백엔드 설계는 `kista-api/docs/superpowers/specs/2026-07-30-vr-explicit-initial-value-design.md` 참고) 초기 V값을 직접 지정할 수 있게 된다. 프론트엔드에 이 입력을 노출한다.

## 우선순위 (서버와 동일)

1. 초기 V 입력값이 있으면 → 그 값을 V값으로 전송
2. 없으면 → 기존처럼 평단가×수량 기반 평가금 추정치 사용
3. 초기 V·평단가·수량 모두 없으면 → 기존처럼 첫 매수 후 산정(빈 값 전송)

## UI 변경

`VrSettingsSection`의 "고급 설정"(`<details>`, 등록 전용 `!isEdit`) 안에 `초기 V` `UnitInput`을 추가한다.

- 위치: 고급 설정 첫 항목(밴드 폭 앞) — 등록 시 가장 먼저 결정할 값이므로
- unit: USD, placeholder: "평가금 사용" (미입력 시 기존 평가금 추정 로직으로 대체됨을 안내)
- 수정 모드에서는 기존처럼 읽기전용 "초기 V값" 표시만 유지(이 입력은 등록 전용이라 관여하지 않음)

## `useStrategyForm` 변경

`VrFields`에 `initialValue: number | null` 추가(백엔드 필드명 `initialVrValue`와 구분하기 위해 폼 내부 키는 `initialValue` 유지 — 기존 read-only prop `initialVrValue`와 이름 충돌 방지).

- `strategyFormSchema`에 `initialValue` 추가, 기본값 `null`
- `setVrField('initialValue', ...)`로 다른 VR 필드와 동일하게 연결
- payload 빌드 시: `initialValue`가 있으면 `initialVrValue: initialValue`로 전송, 없으면 생략

### 인출식 사전 검증 (`normalizedInitialValue`)

현재 `normalizedInitialValue = (avgPrice ?? 0) * (quantity ?? 0)`로 추정 V값을 계산해 인출식 최소자산 클라이언트 사전검증에 사용한다. 이 값은 **UI 게이트("거치식/인출식은 초기 V 또는 예수금 > 0") 판정에만** 초기 V 입력값을 우선 반영한다:

```ts
const normalizedInitialValue = initial
  ? initial.vr?.value ?? 0
  : (initialValue ?? (avgPrice ?? 0) * (quantity ?? 0))
```

**주의**: 서버는 인출식 최소자산 검증(`initialAssets < required`)에서 초기 V override를 반영하지 않고 항상 실제 평가금(전일종가×보유수량) 기준으로 계산한다(kista-api 설계 문서 참고). 클라이언트 사전검증은 서버와 완전히 동일한 시장가 데이터를 갖고 있지 않으므로 근사치로 `normalizedInitialValue`(override 우선)를 계속 사용하되, 최종 차단은 서버가 수행한다는 기존 주석 원칙을 유지한다. 인출식 조건에서 override만 있고 실제 평가금이 작을 경우 클라이언트는 통과시켜도 서버가 400으로 거부할 수 있음 — 기존에도 "서버 V값은 시장가 기준이라 추정치와 다를 수 있음"과 동일한 성격의 오차이므로 별도 처리 없이 기존 에러 토스트 흐름을 따른다.

## 타입 동기화

로컬 kista-api에 `initialVrValue` 필드가 반영된 뒤 `npm run fetch:spec && npm run gen:types`로 `openapi.json`/`api-types.ts` 갱신. 로컬 백엔드 기동이 불가능하면 `StrategyRequest`/`TradingCycleRequest` 타입에 필드를 수동 추가하고 추후 재생성 시 정합성 확인.

## 영향 범위

- `features/strategy/create-strategy/sections/VrSettingsSection.tsx`
- `features/strategy/create-strategy/model/useStrategyForm.ts`
- `features/strategy/create-strategy/model/strategyFormSchema.ts`
- `shared/lib/api-types.ts` (재생성 또는 수동 동기화)

## 테스트

- `VrSettingsSection.test.tsx`: 고급 설정에 초기 V 입력이 렌더되는지, 수정 모드에서는 렌더되지 않는지
- `useStrategyForm.test.ts`: 초기 V 입력 시 payload에 `initialVrValue` 포함, 미입력 시 생략되는지
