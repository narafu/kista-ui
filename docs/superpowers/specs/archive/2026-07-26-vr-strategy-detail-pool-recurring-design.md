# VR 전략 상세 페이지 — Pool·정기 입출금 표시 설계

## 목적

VR(밸류 리밸런싱) 전략 상세 페이지에서 지금까지 화면에 없던 두 정보(`intervalWeeks` 롤오버 주기, `recurringAmount` 정기 입출금)를 노출하고, 기존 "운용 방식" 카드가 "전략타입" 카드와 같은 문자열(`VR`)을 중복 표시하던 문제를 함께 해소한다. 필요한 모든 값은 이미 API 응답에 있으므로 백엔드 변경 없이 프론트엔드만으로 완결한다.

## 범위

- `widgets/strategy-detail/StrategyDetail.tsx`의 VR 분기(`strategy.vr != null`)만 재구성한다.
- 비VR(INFINITE·PRIVACY) 전략의 메타/요약/포지션 그리드는 변경하지 않는다.
- `poolLimit`은 현재와 동일하게 USD 금액 그대로 표시한다(비율(%) 환산은 이번 범위에 포함하지 않는다).

## 현재 구조의 문제

- "전략타입" 카드(`strategy.type`)와 "운용 방식" 카드가 VR일 때 모두 `"VR"` 문자열을 표시해 중복된다.
- `intervalWeeks`(주기), `recurringAmount`(정기 입출금)는 API 응답(`StrategyVrSummary`)에 이미 있지만 화면에 표시되지 않는다.
- "시작금액" 카드가 표시하는 값(`strategy.initialUsdDeposit`)은 VR에서 "이번 사이클 시작 시점의 예수금"과 동일한 성격의 값으로, VR 전용 그리드의 `pool` 개념과 같다.

## 새 레이아웃 (VR 전용)

기존 3블록(전략타입/다음사이클 메타 그리드, 분할·운용방식/시작금액 요약 그리드, V값·밴드폭·pool상한·G 그리드)을 아래 3줄 구성으로 대체한다. `data-testid="strategy-vr-grid"`는 유지하되 내부 구조를 이 설계로 교체한다.

```
줄1 (2열, PC·모바일 동일 순서): 전략타입 | 운용 방식
줄2 (2열, PC·모바일 순서 반전):
  PC:    밴드 폭 | 주기
  모바일: 주기   | 밴드 폭
줄3 (모바일 2열 x 2행 / PC 4열 x 1행, 순서 동일): G | V | pool | pool 상한
```

줄2의 순서 반전은 DOM 순서를 모바일 기준(주기, 밴드 폭)으로 두고 `order-1 lg:order-2` / `order-2 lg:order-1` 유틸리티로 시각 순서만 breakpoint별로 바꾼다.

## 카드별 값 규칙

| 카드 | 라벨 | 값 소스 | 값 형식 |
| --- | --- | --- | --- |
| 전략타입 | `전략타입` | `strategy.type` | 기존과 동일 |
| 운용 방식 | `운용 방식` | `strategy.vr.recurringAmount` | `> 0`: `적립식($금액)` · `=== 0`: `거치식` · `< 0`: `인출식($|금액|)` |
| 밴드 폭 | `밴드 폭` | `strategy.vr.bandWidth` | `{bandWidth}%` (기존과 동일) |
| 주기 | `주기` | `strategy.vr.intervalWeeks` | `{intervalWeeks}주` |
| G | `G` | `strategy.vr.gradient` | 기존과 동일 |
| V | `V` | `strategy.vr.value` | `$${fmtUsd(value)}` (라벨만 "V값"→"V") |
| pool | `pool` | `strategy.initialUsdDeposit` | `$${fmtUsd(...)}` — 기존 "시작금액" 카드와 동일 값, 라벨/위치만 이동 |
| pool 상한 | `pool 상한` | `strategy.vr.poolLimit` | `$${fmtUsd(poolLimit)}` (변경 없음) |

VR 전략에서는 "시작금액"을 별도 카드로 표시하지 않는다(`pool` 카드가 그 역할을 겸한다).

## 영향받지 않는 부분

- 비VR 전략의 "전략타입/다음 사이클", "분할 또는 운용 방식/시작금액", 회차·단위금액·기준가·목표가 그리드는 그대로 둔다.
- "다음 주문", 주문 이력, 잔고 이력(사이클 히스토리) 섹션은 변경하지 않는다 — "가용 Pool"(예수금 실시간 값)은 이미 잔고 이력에서 확인 가능하므로 별도 카드로 추가하지 않는다.
- kista-api 응답 스키마, `entities/strategy` 타입은 변경하지 않는다(모든 소비 필드가 이미 존재).

## 테스트

- `StrategyDetail.test.tsx`의 VR 케이스(기존 199~226행 부근)를 새 레이아웃 기준으로 갱신: `운용 방식`에 `인출식($100.00)`이 표시되는지(기존 fixture가 `recurringAmount: -100`이므로), `주기`에 `4주`가 표시되는지, `pool`에 `initialUsdDeposit` 값이 표시되는지, `pool 상한`은 기존과 동일하게 검증.
- 적립식(`recurringAmount > 0`)·거치식(`=== 0`) 케이스도 추가해 "운용 방식" 문구 분기를 모두 커버한다.
- 비VR(INFINITE/PRIVACY) 기존 테스트는 변경 없이 통과해야 한다(회귀 확인).
