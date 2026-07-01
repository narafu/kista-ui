# Admin Trade Correction UI Design

## Goal

관리자 거래 내역 페이지에서 주문 보정 기능을 바로 수행할 수 있게 한다.  
대상 선택은 `사용자 -> 계좌 -> 전략 -> 거래일 -> 주문` 순으로 진행하고, 선택한 주문 상태에 따라 다른 보정 폼을 노출한다.

이번 UI 작업은 이미 구현된 `kista-api` 관리자 주문 보정 API를 운영자가 실사용 가능한 화면으로 연결하는 것이 목적이다.

## Scope

- 기존 `/admin/trades` 페이지 확장
- 전략별 주문 조회 UI 추가
- 전략 상태 `ACTIVE <-> PAUSED` 토글 UI 추가
- 주문 상태별 보정 폼 추가
- 보정 성공 후 주문 재조회와 결과 표시

포함하지 않는 범위:

- 별도 관리자 페이지 신설
- 과거 체결 히스토리 재계산 UX
- 일반 사용자 화면 노출

## Current Context

- 관리자 거래 내역은 `app/(admin)/admin/trades/page.tsx`에서 서버 렌더링한다.
- 관리자 API 프록시는 `app/api/admin/[[...path]]/route.ts` catch-all 구조라 새 경로를 그대로 프록시할 수 있다.
- 사용자/관리자 API 유틸은 `entities/user/api/index.ts`, 타입은 `entities/user/model/types.ts`에 모여 있다.
- 기존 거래 테이블은 단순 조회 전용이며, 별도 상호작용 상태를 갖고 있지 않다.

## Recommended Approach

기존 `/admin/trades` 페이지를 유지하고, 테이블 아래에 `보정 워크벤치`를 추가한다.

이 방식을 추천하는 이유:

- 운영자가 거래 조회와 보정을 한 화면에서 연속 수행할 수 있다.
- 기존 라우팅과 사이드바 구성을 바꾸지 않아도 된다.
- “누구의 어떤 전략을 수정하는지”를 지속적으로 보여주기 쉽다.

대안으로 별도 `/admin/order-corrections` 페이지 분리도 가능하지만, 실제 사고 대응 시 화면 이동이 늘어난다.

## Page Structure

### 1. Existing Header and Filters

- 기존 제목, 건수 표시, 날짜 범위 필터, 페이지 크기 선택을 유지한다.
- 이 섹션은 현재 관리자 거래 조회 UX를 깨지 않도록 최대한 보존한다.

### 2. Trade Table

- 기존 거래 테이블을 유지하되, 행 선택 상태를 추가한다.
- 선택된 행은 배경/보더 강조로 구분한다.
- 테이블 컬럼은 기존 값에 더해 `timing`, `externalOrderId`, `filledQuantity`, `filledPrice`를 노출할 수 있도록 확장한다.
- 보정 가능한 상태(`PLANNED`, `PLACED`, `FILLED`, `PARTIALLY_FILLED`)는 시각적으로 동일한 선택 affordance를 제공한다.
- 그 외 상태는 선택은 가능하더라도 보정 액션은 비활성 처리한다.

### 3. Correction Workbench

테이블 아래에 항상 보이는 고정 섹션으로 둔다.

구성:

- 현재 선택 컨텍스트 요약
  - 사용자 닉네임
  - 계좌 식별값
  - 전략 식별값 또는 전략 타입
  - 거래일
  - 선택 주문 상태
- 선택 체인
  - 사용자
  - 계좌
  - 전략
  - 거래일
  - 주문
- 전략 상태 토글
  - `ACTIVE` / `PAUSED`
- 상태별 보정 폼
- 실행 결과 메시지

워크벤치가 비어 있는 경우에도 섹션은 유지하고, “보정할 주문을 선택하세요” 같은 안내 문구를 보여준다.

## Interaction Model

### Selection Flow

두 진입점을 모두 허용한다.

1. 거래 테이블에서 행을 먼저 선택  
이 경우 해당 행의 `userId`, `tradeDate`를 기반으로 워크벤치 값을 초기화한다.

2. 워크벤치에서 직접 선택 체인을 따라 내려감  
이 경우 관리자가 특정 전략/거래일을 먼저 고르고 주문을 나중에 선택할 수 있다.

선택 체인 규칙:

- 사용자 변경 시 계좌, 전략, 주문 선택 초기화
- 계좌 변경 시 전략, 주문 선택 초기화
- 전략 변경 시 거래일과 주문 선택 초기화
- 거래일 변경 시 주문 선택만 초기화
- 주문 선택 시 폼 모드와 기본값 자동 갱신

### Strategy Status Toggle

- 워크벤치 내부에서 현재 전략 상태를 보여준다.
- 상태 변경은 주문 보정과 별도의 액션으로 둔다.
- 성공 시 전략 목록과 현재 상태 표시를 갱신한다.

### Order Correction Modes

#### `PLANNED`

- 입력 필드: 가격, 수량, 메모
- 실행 액션: `PLANNED_EDIT`
- 설명 문구: “증권사 접수 전 계획 주문을 수정합니다.”

#### `PLACED`

- 입력 필드: 가격, 수량, 메모
- 실행 액션: `PLACED_REPLACE`
- 경고 문구: “기존 주문을 취소한 뒤 새 주문을 접수합니다.”
- 확인 버튼 문구를 더 강하게 둔다.
  - 예: `취소 후 재주문`

#### `FILLED` / `PARTIALLY_FILLED`

- 입력 필드: 방향, 가격, 수량, 메모
- 실행 액션: `FILLED_CORRECTION`
- 설명 문구: “기존 체결은 유지하고 보정 체결을 추가합니다.”

#### Other Statuses

- `FAILED`, `CANCELLED` 등은 읽기 전용
- 왜 보정할 수 없는지 안내 문구를 표시한다

## Data and Component Boundaries

### Server Page

`app/(admin)/admin/trades/page.tsx`

- 기존처럼 초기 거래 목록을 서버에서 가져온다
- 이후 상호작용은 클라이언트 컴포넌트로 위임한다

### New UI Components

- `widgets/admin-trade-list/AdminTradesWorkbench.tsx`
  - 전체 상호작용 상태 소유
- `widgets/admin-trade-list/AdminTradesTable.tsx`
  - 기존 거래 목록 렌더링
- `widgets/admin-trade-list/AdminTradeCorrectionPanel.tsx`
  - 선택 체인 + 전략 상태 + 주문 선택
- `widgets/admin-trade-list/AdminOrderCorrectionForm.tsx`
  - 상태별 보정 입력 폼

이름은 구현 중 기존 슬라이스 규칙에 맞춰 조정할 수 있지만, 책임 분리는 유지한다.

### Entity/API Layer Additions

`entities/user/model/types.ts`

- `AdminStrategy`
- `AdminStrategyOrder`
- `AdminOrderCorrectionRequest`
- `AdminOrderCorrectionResponse`

`entities/user/api/index.ts`

- 전략 목록 조회
- 전략별 주문 조회
- 전략 상태 변경
- 주문 보정 실행

## UX Rules

- 보정 워크벤치는 항상 표시한다. 숨겨진 drawer나 modal로 보내지 않는다.
- 현재 선택한 대상이 무엇인지 한 줄 요약으로 상단에 고정한다.
- destructive 성격이 있는 `PLACED_REPLACE`는 일반 저장 버튼과 시각적으로 구분한다.
- 성공 후에는 토스트 또는 인라인 결과 요약을 즉시 보여주고, 관련 주문 목록을 재조회한다.
- 에러 메시지는 모호하게 처리하지 않고, 어떤 단계에서 실패했는지 보여준다.
  - 주문 조회 실패
  - 전략 상태 변경 실패
  - 보정 실행 실패
- 모바일에서는 선택 체인과 폼을 세로 스택으로 배치하고, 테이블은 기존처럼 가로 스크롤을 허용한다.

## Testing

### Unit / Component Tests

- 선택 체인 변경 시 하위 선택이 초기화된다
- 주문 상태에 따라 올바른 보정 폼이 렌더링된다
- `PLACED` 상태에서 경고 문구와 전용 CTA가 보인다
- 보정 불가 상태에서 버튼이 비활성화된다

### API Tests

- 전략 목록 조회 파라미터 전달
- 전략별 주문 조회 경로와 `tradeDate` 전달
- 전략 상태 변경 payload 전달
- 주문 보정 요청 body가 모드별로 올바르게 구성된다

### Page / Integration Tests

- 기존 거래 목록 렌더링은 유지된다
- 테이블 행 선택 시 워크벤치가 동기화된다
- 보정 성공 후 주문 목록 재조회가 실행된다
- 전략 상태 토글 성공 후 상태 표시가 갱신된다

## Risks

- 기존 거래 페이지가 조회 전용에서 상호작용 중심으로 바뀌므로 컴포넌트 분리가 느슨하면 빠르게 비대해질 수 있다
- `PLACED_REPLACE`는 운영상 민감한 액션이라 CTA/문구가 충분히 명확해야 한다
- 사용자/계좌/전략/주문 선택 상태를 한 컴포넌트에 과도하게 몰아넣으면 테스트가 어려워진다

## Implementation Order

1. 타입/API 함수 추가
2. 페이지를 클라이언트 위젯 중심 구조로 분리
3. 전략/주문 선택 워크벤치 추가
4. 상태별 보정 폼 추가
5. 전략 상태 토글 추가
6. 테스트와 스타일 정리
