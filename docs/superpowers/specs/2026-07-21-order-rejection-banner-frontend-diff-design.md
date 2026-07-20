# 미접수 주문 배너 — 프론트엔드 diff (v3, 최종 채택)

> kista-api 세션에서 같은 문제로 v1(orders에 REJECTED row 영속화)·v2(`order_rejections` 전용 테이블 영속화)를 스펙·계획까지 작성했으나 사용자가 "최대한 심플하게"를 재차 요청하면서 보류(DEFERRED)됐다. v3는 백엔드를 전혀 건드리지 않고 kista-ui가 이미 받고 있는 두 필드(`preview.orders`, `preview.todayOrders`)를 비교하는 것만으로 같은 목적을 달성한다.
> - v2 스펙: `../../../kista-api/docs/superpowers/specs/2026-07-20-rejected-order-persistence-design.md` (DEFERRED)
> - v2 계획: `../../../kista-api/docs/superpowers/plans/2026-07-20-order-rejection-banner.md` (DEFERRED)
> - 관련 선행 작업: `2026-07-18-strategy-card-deficit-accuracy-design.md` — 같은 근본 문제("매도만 접수되고 매수 부족 여부를 알 수 없음")를 목록 카드(`StrategyCard.tsx`)에서 다룬 스펙. 이번 v3는 그 문제의 상세 페이지(`StrategyDetail.tsx`, "다음 주문" 카드) 쪽 마무리다.

## 배경

토스증권 PRIVACY 전략에서 예수금 부족 상태로 스케쥴러가 실행되면 매수는 거절되고 매도만 접수되는데, "다음 주문" 카드에는 매도 접수 사실만 보이고 매수가 왜 안 들어갔는지 아무 단서가 없었다(원본 이슈).

사용자가 "바로 주문" 영역에서 실제로 원하는 건 세 가지뿐이다:
1. 장 시작 전 — 오늘 얼마가 주문될지 미리 보기 + 예수금 충분한지 확인
2. 장 시작 후 — 내 주문이 잘 들어갔는지 확인
3. 장 시작 후 — **안 들어간 게 있는지 확인** (이번에 새로 필요한 부분)

1·2는 이미 `preview.orders`(계획)·`preview.todayOrders`(실제 접수, "N건 접수됨" 목록)로 구현돼 있어 변경이 필요 없다. 3만 프론트에서 두 목록을 방향(BUY/SELL) 단위로 비교하면 추가 데이터 없이 구할 수 있다.

## 설계

### 핵심 아이디어

kista-api `TradingPreviewService.preview()`는 스케쥴러 성공 여부와 무관하게 **매번 오늘자 전체 계획을 새로 재계산**해 `orders`에 담아 반환한다. 반면 `todayOrders`는 실제로 DB에 `PLANNED`/`PLACED`로 저장된 것만 담는다. 스케쥴러가 오늘 이미 실행됐고 그 결과가 안정적이라면(=계획 방향 구성이 스케쥴러 실행 시점과 조회 시점 사이 바뀌지 않는다면), 계획에는 있는데 접수된 게 없는 방향이 곧 "예산 부족으로 거절된 방향"이다.

```
plannedDirections = { d : preview.orders에 direction=d인 주문이 1건 이상 }
placedDirections  = { d : preview.todayOrders에 direction=d인 주문이 1건 이상 }
unplacedDirections = plannedDirections - placedDirections
```

kista-api `docs/agents/constraints.md`에 따르면 BUY는 사이클당 all-or-nothing으로 배정되므로 방향 단위 diff로 충분하다 — "BUY 일부만 거절"은 발생하지 않는다.

### 렌더링 조건

`mode === 'executed'`(오늘 이미 뭔가 접수됐거나 수동 실행한 상태)일 때만 의미가 있다. `mode === 'preview'`(아직 스케쥴러가 안 돌았거나 오늘 아무것도 접수 안 된 상태)에서는 "아직 시도 자체가 없는 것"과 "시도했는데 전량 거절된 것"을 구분할 수 없으므로 배너를 띄우지 않는다 — 이 구분 불가 케이스가 v3의 알려진 한계다(아래 "한계" 참고).

### 구현 위치

`widgets/strategy-detail/StrategyDetail.tsx` 한 파일, `mode`/`orders`/`placedOrders` 파생 로직 바로 아래(`:66-68` 부근)에 추가:

```ts
  const plannedDirections = new Set(orders.map((o) => o.direction))
  const placedDirections = new Set(placedOrders.map((o) => o.direction))
  const unplacedDirections = mode === 'executed'
    ? [...plannedDirections].filter((d) => !placedDirections.has(d))
    : []
```

`orders`는 이미 `:68`에서 `preview?.orders ?? []`로 선언돼 있고, `placedOrders`는 `:65`에서 `manualOrders ?? (hasServerOrders ? serverOrders : [])`로 선언돼 있다 — 둘 다 재사용, 신규 API 호출 없음.

배너는 "다음 주문" 카드 헤더에, 기존 `BuyCompetitionNotice` 자리(`:229-231`, `:308-310`)에 대신 렌더링한다:

```jsx
{unplacedDirections.length > 0 && (
  <div className="flex flex-col gap-0.5 mt-1.5">
    {unplacedDirections.map((d) => (
      <p key={d} className="text-sm lg:text-base text-warn">
        {d === 'BUY' ? '예수금 부족으로 매수 미접수' : '판매가능수량 부족으로 매도 미접수'}
      </p>
    ))}
  </div>
)}
```

건수(`N건`)는 표시하지 않는다 — `preview.orders`의 방향별 건수가 실제 거절 당시 후보 건수와 정확히 같다는 보장이 없다(재계산 시점에 따라 미세하게 달라질 수 있음). "미접수 여부"만 정확하고 "몇 건"은 근사치이므로, 근거 없는 숫자를 보여주지 않는다.

기존 `BuyCompetitionNotice`(재시뮬레이션 배지, 헤더 인라인 + `CardContent` row-variant 두 곳)는 제거한다 — 이번 배너가 유일한 정보원이 되므로 서로 다른 근거로 같은 말을 반복하는 걸 피한다. 두 사용처는 데스크톱(`variant="inline"`, `hidden lg:flex`)/모바일(`variant="row"`, `lg:hidden`)로 반응형 분할된 동일 개념이라 **반드시 둘 다** 제거해야 한다 — 한쪽만 지우면 화면 크기별 비대칭이 생긴다. 제거 후 `BuyCompetitionNotice.tsx`/`BuyCompetitionNotice.test.tsx`도 어디서도 참조되지 않으므로 함께 삭제한다.

`hasDeficit`/`competition`/`deficitUsd` 계산 로직과 `preview.competition` 필드 자체는 그대로 둔다 — `StrategyDetail.tsx`의 "바로 주문" 버튼 옆 소형 배지(`휴장일`/`예수금 부족`, `:235-237`)와 클릭 가드(`:245-247`)가 계속 쓰고, `StrategyCard.tsx`(목록 카드 테두리 색상, `2026-07-18-strategy-card-deficit-accuracy-design.md`에서 다룬 영역)도 별도로 쓴다.

## 한계 (알고 있는 트레이드오프)

- **전량 거절 감지 불가**: 그날 BUY·SELL이 모두 거절돼 `todayOrders`가 완전히 비면 `mode`가 `preview`로 남아 배너가 안 뜬다. "아직 스케쥴러가 안 돌았다"와 "돌았는데 다 거절됐다"를 프론트가 구분할 방법이 없다. (원본 이슈처럼 SELL은 성공하고 BUY만 실패한 케이스는 정확히 잡는다.)
- **이력 미보존**: 당일 화면에서만 보이고, 다음 날 조회하거나 나중에 "그날 왜 매수가 안 됐지"를 되짚어볼 방법이 없다.
- **드리프트 가능성(낮음)**: `preview.orders`는 조회 시점에 재계산되므로, 스케쥴러 실행 이후 시장 상황이 크게 바뀌면 방향 구성 자체가 달라질 이론적 가능성이 있다(실제로는 BUY/SELL 존재 여부가 하루 안에 뒤집히는 경우는 드묾).

이 한계들이 실제로 사용자 경험에 문제를 일으키면(예: 전량 거절이 잦은 계좌가 나오면) kista-api 쪽 v2(`order_rejections` 영속화)를 다시 꺼내 실행한다.

## 테스트 계획

- `StrategyDetail.test.tsx`:
  - `mode==='executed'`, `orders`에 BUY 있고 `todayOrders`에 BUY 없음(SELL만 있음) → "예수금 부족으로 매수 미접수" 배너 노출
  - `mode==='executed'`, `orders`와 `todayOrders`의 방향 구성이 동일 → 배너 미노출
  - `mode==='preview'`(오늘 아무것도 접수 안 됨) → `orders`에 BUY가 있어도 배너 미노출 (한계 케이스를 의도된 동작으로 고정)
  - `BuyCompetitionNotice`가 더 이상 렌더링되지 않는지(제거 회귀 — 헤더 인라인 + row-variant 둘 다)
  - 기존 "buy competition notice" 테스트 2건은 컴포넌트 제거로 무의미해지므로 위 배너 테스트로 교체

## 구현 범위 요약

- 수정: `widgets/strategy-detail/StrategyDetail.tsx` (파생 값 추가 + 배너 렌더링 + `BuyCompetitionNotice` 사용처 제거)
- 수정: `widgets/strategy-detail/StrategyDetail.test.tsx`
- 삭제: `widgets/strategy-detail/BuyCompetitionNotice.tsx`, `BuyCompetitionNotice.test.tsx`
- kista-api 변경 없음, DB 마이그레이션 없음
