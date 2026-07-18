# 전략 목록 카드 예수금 부족 표시 정확도 개선

## 배경

세션 초반에 사용자가 제기한 문제: "장 개시 스케쥴러에서 예수금 부족으로 매도 주문만 접수된 경우, 매수 주문이 예수금 부족으로 남아있다는 정보를 알 수가 없다. 전략 목록에서도 녹색으로 처리돼서 알기 어렵다."

코드 조사 결과, 이 문제의 근본 원인은 두 가지였다:

1. **부정확한 부족 판정**: `widgets/strategy-card/StrategyCard.tsx`의 `hasDeficit` 계산이 `useAccountMarginQuery`(계좌 실잔고) + 대상 전략 BUY 합계 + `otherStrategiesPlannedBuyUsd`(이미 PLANNED로 저장된 타 전략 BUY)만으로 부족 여부를 판정한다. 이는 "아직 스케쥴러가 돌지 않은 우선순위 높은 타 전략이 예산을 먼저 가져갈 가능성"을 반영하지 못하는 구식 계산이다 — 이번 세션 앞부분에서 `StrategyDetail.tsx`(전략 상세 페이지)에 대해 이미 동일한 문제를 발견해 kista-api `NextOrdersResponse.competition` 필드(계좌 전체 우선순위 경쟁 시뮬레이션 결과)로 교체했으나, `StrategyCard.tsx`는 범위 밖으로 분리해 미반영 상태였다.

2. **테두리 색 우선순위 버그**: `StrategyCard.tsx:45-49`
   ```ts
   const orderBorderColor = hasPlannedOrder
     ? 'var(--status-ok)'
     : hasDeficit
       ? marketSession?.session === 'DIRECT' ? 'var(--status-error)' : 'var(--warn)'
       : null
   ```
   `hasPlannedOrder`는 매매 방향과 무관하게 "오늘 PLANNED 상태 주문이 하나라도 있는가"만 검사한다(`preview.todayOrders`에 `status === 'PLANNED'`인 항목 존재 여부). 따라서 SELL 주문 하나만 성공적으로 PLANNED 저장되고 BUY가 예산 부족으로 거절된 날에도, `hasPlannedOrder=true`가 되어 `hasDeficit` 평가 자체가 무시되고 **무조건 초록 테두리**가 렌더링된다. 사용자가 실제로 겪은 "녹색으로 보인다"는 정확히 이 우선순위 버그가 원인이다.

## 범위

- kista-ui `widgets/strategy-card/StrategyCard.tsx` + `StrategyCard.test.tsx`만 수정.
- kista-api 변경 없음 — `NextOrdersResponse.competition` 필드는 이미 존재(2026-07-18 세션 앞부분에 구현·병합 완료), 이번 작업은 그 필드를 `StrategyCard.tsx`에서 소비하도록 연결하는 것뿐.
- `StrategyCard`는 `widgets/all-strategies/AllStrategiesList.tsx`, `widgets/strategy-list/StrategyList.tsx` 2곳에서 재사용되므로, 이 컴포넌트 하나만 고치면 두 화면(전체 전략 목록 / 계좌별 전략 목록) 모두에 자동 반영된다.
- 야간 스케쥴러 실행 이력을 DB에 영속화하는 것은 범위 밖(사용자가 브레인스토밍 단계에서 "실시간 정확도 개선"만 선택, 과거 실행 이력 기록은 채택하지 않음). 이 설계는 순수하게 "지금 이 순간 다시 계산해도 예산이 부족한가"를 정확히 보여주는 것이 목적이며, 스케쥴러가 자동으로 누락 주문을 재시도하는 기존 자가복구 흐름(`docs/agents/workflow.md` "마감 경로")에 의존한다.

## 변경 내용

### 1. 계산 로직 교체

```ts
// BEFORE
const { items: marginItems, isLoading: isMarginLoading } = useAccountMarginQuery(accountId, {
  enabled: !isLoadingPreview && hasBuyOrders,
})
...
const totalBuyUsd = hasBuyOrders && !isMarginLoading
  ? previewOrders.filter((o) => o.direction === 'BUY').reduce((sum, o) => sum + toNum(o.price) * o.quantity, 0)
  : 0
const purchasableUsd = marginItems.find((i) => i.currency === 'USD')?.purchasableAmount ?? 0
const otherPlannedUsd = toNum(preview?.otherStrategiesPlannedBuyUsd ?? '0')
const hasDeficit = hasBuyOrders && !isLoadingPreview && !isMarginLoading && totalBuyUsd + otherPlannedUsd > purchasableUsd
```

```ts
// AFTER
const competition = preview?.competition ?? null
const hasDeficit = hasBuyOrders && competition ? !competition.sufficientBudget : false
```

`useAccountMarginQuery` import(`@entities/account`)와 호출 자체를 제거한다 — `StrategyDetail.tsx`에 이미 적용한 것과 동일한 패턴(경쟁 시뮬레이션이 라이브 브로커 잔고를 이미 반영하므로 클라이언트가 별도로 margin 쿼리를 조합할 필요 없음).

`toNum` import는 이 파일의 다른 곳(예: `strategy.currentRound`, `fmtUsd(strategy.initialUsdDeposit)` 등)에서 쓰이는지 확인 후, 이 계산 제거로 인해 미사용이 되면 함께 제거한다.

### 2. 테두리 색 우선순위 수정

```ts
// BEFORE
const orderBorderColor = hasPlannedOrder
  ? 'var(--status-ok)'
  : hasDeficit
    ? marketSession?.session === 'DIRECT' ? 'var(--status-error)' : 'var(--warn)'
    : null
```

```ts
// AFTER
const orderBorderColor = hasDeficit
  ? (marketSession?.session === 'DIRECT' ? 'var(--status-error)' : 'var(--warn)')
  : hasPlannedOrder
    ? 'var(--status-ok)'
    : null
```

부족 상태가 최우선 — SELL이 PLANNED로 성공했더라도 BUY가 부족하면 부족색이 렌더링된다. 색상값 자체(초록/주황/빨강)와 DIRECT/BLOCKED 분기는 기존 그대로 유지.

### 3. 테스트 갱신 (`StrategyCard.test.tsx`)

- `@entities/account` mock 블록(`marginState` 포함) 전체 삭제 — 컴포넌트가 더 이상 이 모듈을 import하지 않음.
- 기존 "주황 테두리"/"빨강 테두리" 테스트 2건에 `previewState.data.competition`을 추가해 `sufficientBudget: false`로 설정(더 이상 `marginState`로 부족을 유도할 수 없으므로).
- 기존 "초록 테두리" 테스트는 `orders`(BUY 후보)를 설정하지 않으므로 `hasBuyOrders=false` → `hasDeficit=false`가 되어 그대로 통과해야 한다(회귀 없음).
- **신규 회귀 테스트**: todayOrders에 SELL PLANNED 주문이 있고 동시에 `orders`(BUY 후보) + `competition.sufficientBudget=false`인 상태를 만들어, `orderBorderColor`가 초록(`var(--status-ok)`)이 아니라 부족색(`var(--warn)` 또는 `var(--status-error)`)으로 렌더링됨을 검증한다. 이 테스트가 이번 작업의 핵심 목적(우선순위 버그 회귀 방지)이다.

## 테스트

- `npm run test:run -- widgets/strategy-card`
- `npm run typecheck`
- 기존 `AllStrategiesList.test.tsx`는 `StrategyCard`를 mock 처리하므로 영향 없음(재확인만).
