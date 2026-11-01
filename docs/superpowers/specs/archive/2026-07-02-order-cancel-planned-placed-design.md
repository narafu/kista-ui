# Order Cancel Planned + Placed Design

## Goal

전략 상세의 `다음 주문` 영역에서 `PLANNED`, `PLACED`를 구분하지 않고 모두 개별 취소 가능하게 만들고, `전체 취소` 역시 당일 `PLANNED + PLACED` 주문 전체를 취소하도록 UI, 문서, API 계약을 일치시킨다.

## Current Context

- `kista-ui`는 `widgets/strategy-detail/OrderRows.tsx`에서 `PLACED` 주문의 개별 취소 버튼을 숨기고 있다.
- `kista-ui`의 `entities/order/api/index.ts`와 `StrategyDetail.tsx`는 `DELETE /api/trading-cycles/{id}/execute`를 사실상 `PLACED` 중심 동작으로 설명한다.
- `kista-api`의 `OrderCancelService.cancelByCycle()`는 이미 `PLANNED`를 먼저 삭제하고 `PLACED`를 증권사 취소하는 흐름을 갖고 있다.
- 반면 `kista-api`의 컨트롤러 주석, OpenAPI summary, 일부 테스트와 예외 문구는 아직 `PLACED` 중심 표현에 머물러 있다.

## Decision

권장안은 UI, API 계약, 테스트를 모두 `PLANNED + PLACED` 기준으로 정리하는 것이다.

이유:

- 실제 서비스 로직과 외부 계약의 의미를 맞출 수 있다.
- 장 개시 스케줄러 이후 `INFINITE` 매도 선접수 주문도 사용자가 동일한 mental model로 다룰 수 있다.
- `PLANNED`와 `PLACED`를 서로 다른 UX로 숨겨두면 사용자는 취소 가능성보다 내부 상태 차이를 먼저 학습해야 한다.

## Scope

- `kista-ui` 전략 상세 주문 목록의 개별 취소 버튼 노출 조건 수정
- `kista-ui` 주문 취소 관련 주석/문구 정리
- `kista-api` 개별 취소/전체 취소의 컨트롤러 주석과 OpenAPI summary 수정
- `kista-api` 테스트를 `PLANNED + PLACED` 허용 기준으로 보강

포함하지 않는 범위:

- 취소 엔드포인트 경로 변경
- 주문 상태 enum 변경
- 전략 주문 내역의 상태 라벨 개편

## UI Design

### Individual Cancel

- `OrderRows`는 `id`가 있는 주문이면 `PLANNED`, `PLACED` 모두 `취소` 버튼을 표시한다.
- `CANCELLED`, `FILLED`, `FAILED` 등은 이 화면의 `todayOrders` 입력 소스가 아니므로 별도 분기 없이 기존 데이터 흐름을 유지한다.

### Bulk Cancel

- `StrategyDetail`의 `전체 취소` 버튼은 현재 표시 조건을 유지한다.
- 문구와 내부 주석은 “오늘 등록된 주문 전체 취소” 또는 “오늘 `PLANNED + PLACED` 주문 전체 취소” 의미로 통일한다.

## API / Backend Design

### Bulk Cancel

- `DELETE /api/trading-cycles/{id}/execute`는 당일 같은 전략 사이클의 `PLANNED` 주문을 먼저 DB에서 취소 처리하고, 이어서 `PLACED` 주문을 증권사 취소 후 `CANCELLED`로 마킹한다.
- 반환값 `CancelResult.cancelledCount`에는 `PLANNED` 삭제 건수와 `PLACED` 취소 성공 건수를 함께 포함한다.
- `failedCount`는 증권사 취소가 필요한 `PLACED` 주문 실패 건수만 집계한다.

### Single Cancel

- `DELETE /api/orders/{orderId}`는 `PLANNED`와 `PLACED`를 모두 허용한다.
- `PLANNED`는 증권사 미접수 상태이므로 DB 상태만 `CANCELLED`로 바꾼다.
- `PLACED`는 증권사 취소 후 DB 상태를 `CANCELLED`로 바꾼다.
- 그 외 상태는 409를 유지한다.

## Testing

### kista-ui

- `PLACED` 주문도 개별 `취소` 버튼이 렌더링되는 테스트를 추가한다.

### kista-api

- `cancelByCycle()`가 `PLANNED` 삭제 건수까지 `cancelledCount`에 포함하는 테스트를 추가한다.
- `cancelOrder()`가 `PLANNED` 주문도 허용하고 증권사 취소 없이 DB 취소만 수행하는 테스트를 추가한다.
- WebMvc 테스트의 409 메시지 가정도 `PLACED만` 기준에서 `취소 가능한 상태가 아닙니다` 기준으로 정리한다.

## Risks

- 프론트에서 `PLACED` 버튼을 노출하면 사용자는 증권사 취소 실패를 더 자주 경험할 수 있으므로, 실패 toast는 기존처럼 유지하되 의미를 흐리지 않아야 한다.
- 스펙 주석과 테스트만 바꾸고 문구를 일부 놓치면 다시 오해가 생길 수 있으므로 UI/컨트롤러/포트 주석을 함께 갱신해야 한다.

## Success Criteria

- 전략 상세 `다음 주문` 목록에서 `PLANNED`, `PLACED` 모두 개별 취소 버튼이 보인다.
- `전체 취소` 설명과 구현이 당일 `PLANNED + PLACED` 전체 취소 의미로 일치한다.
- `kista-api` 테스트가 `PLANNED + PLACED` 취소 정책을 명시적으로 보호한다.
