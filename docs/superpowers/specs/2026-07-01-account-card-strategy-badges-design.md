# Account Card Strategy Badges Design

## Goal

계좌 목록 카드에서 `전략 N개` 요약을 전략별 compact badge로 교체해, 각 계좌가 어떤 전략을 운용 중인지와 각 전략 상태를 한눈에 읽히게 만든다.

## Current State

- 모바일 계좌 카드의 2행 오른쪽에는 `전략 N개` 또는 `미등록`만 표시된다.
- 데스크톱 계좌 카드는 전략 리스트 행마다 `type`과 `ticker`를 분리해서 보여준다.
- 계좌 단위 집계 상태는 왼쪽 accent strip으로만 표현된다.
- 전략 상태의 세부 차이는 `ACTIVE 1개` 같은 혼합 상태 문구가 있을 때만 간접적으로 드러난다.

## Approved Direction

- 왼쪽 status accent strip은 현재 집계 로직과 시각 표현을 그대로 유지한다.
- `전략 N개` 텍스트는 제거하고, 전략별 badge를 직접 나열한다.
- badge 라벨은 `전략 타입 약어 + '-' + ticker` 형식으로 표기한다.
- 현재 범위의 타입 약어는 아래처럼 고정한다.
  - `PRIVACY -> P`
  - `INFINITE -> I`
- badge 배경은 공통 톤으로 유지하고, 각 badge의 테두리와 텍스트만 전략 상태색을 사용한다.
  - `ACTIVE -> var(--status-ok)`
  - `PAUSED -> var(--warn)`

## Rendering Rules

### Mobile

- 현재 `전략 N개` / `미등록`이 있던 자리를 전략 badge row로 교체한다.
- 전략이 1개 이상이면 `P-SOXL`, `I-MAGX` 같은 badge를 가로로 나열한다.
- 전략이 없으면 기존 `미등록` badge를 유지한다.
- 기존 계좌 닉네임, 화살표, 왼쪽 accent strip은 유지한다.

### Desktop

- 전략 리스트 행에서 분리된 `type` badge와 `ticker` 텍스트를 하나의 strategy badge로 합친다.
- 금액 표시는 현재처럼 우측에 유지한다.
- 전략이 없으면 기존 `전략 미등록` 텍스트를 유지한다.

## Implementation Boundaries

- 변경 범위는 `widgets/account-card/AccountCard.tsx`와 해당 테스트 파일로 제한한다.
- API, entity type, query hook, 상위 페이지 조합 로직은 변경하지 않는다.
- badge용 formatter/helper는 `AccountCard` 파일 내부의 작은 로컬 유틸로 둔다.

## Testing

- 기존 `widgets/account-card/AccountCard.test.tsx`에 회귀 테스트를 추가한다.
- 검증 포인트:
  - `PRIVACY`와 `INFINITE`가 각각 `P`, `I`로 축약된다.
  - `P-SOXL`, `I-MAGX` badge가 렌더된다.
  - `PAUSED` badge가 경고색 테두리/텍스트를 사용한다.
  - 기존 왼쪽 accent strip 집계 표현은 유지된다.

## Risks and Non-Goals

- 이번 변경은 상태 집계 로직 자체를 바꾸지 않는다.
- 전략이 매우 많은 계좌에서 badge 수가 늘어날 수 있지만, 이번 범위에서는 접기나 `+N` 요약을 추가하지 않는다.
- 타입 약어 체계는 현재 존재하는 전략 타입 기준으로만 정의하고, 신규 전략 타입 대응은 별도 작업으로 둔다.
