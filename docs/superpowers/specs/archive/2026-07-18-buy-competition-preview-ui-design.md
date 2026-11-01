# 바로주문 미리보기 예수금 경쟁 정보 UI 연동

## 배경

kista-api의 `NextOrdersResponse`에 `competition` 필드(`BuyCompetitionSummary`)가 추가됐다. 계좌 내 활성 전략 전체를 야간 배치 스케쥴러(`TradingOrderBudgetAllocator`)와 동일한 우선순위(VR→INFINITE→PRIVACY, 동일 타입 내 금액 작은 순)로 시뮬레이션해, 대상 전략의 BUY가 실제로 승인될지 근사 판정한 결과다.

기존 kista-ui의 "다음 주문" 카드(`StrategyDetail.tsx`)는 `otherStrategiesPlannedBuyUsd`(이미 PLANNED로 저장된 타 전략 BUY 합계)만으로 클라이언트가 직접 부족 여부를 계산해왔다. 이 방식은 "아직 스케쥴러가 돌지 않은 우선순위 높은 타 전략이 예산을 먼저 가져갈 가능성"을 반영하지 못한다. `competition.sufficientBudget`은 이 갭을 메운 더 정확한 판정이므로, 기존 클라이언트 계산을 이 값으로 교체한다.

## 범위

- 전략 상세 페이지(`StrategyDetail.tsx`)의 "다음 주문" 카드만 대상. 전략 목록/대시보드(`StrategyCard.tsx`)는 이번 범위 밖 — 별도 이슈(스케쥴러 실행 결과 가시성 문제)로 분리됨.

## 타입 정의

`entities/order/model/types.ts`에 추가:

```ts
export interface CompetingStrategy {
  strategyId: string
  type: StrategyType        // 기존 enum 재사용
  ticker: Ticker             // 기존 enum 재사용
  requiredBuyUsd: string
  priority: number
}

export interface BuyCompetitionSummary {
  sufficientBudget: boolean
  availableDeposit: string
  requiredForThisStrategy: string
  consumedByHigherPriority: string
  blockedByHigherPriority: CompetingStrategy[]
  uncertainStrategyIds: string[]
}
```

`NextOrderPreview` 인터페이스에 필드 추가:

```ts
export interface NextOrderPreview {
  tradeDate: string
  position: NextOrderPositionSnapshot | null
  orders: NextOrderItem[]
  skipReason: SkipReason | null
  todayOrders: PlacedOrder[]
  otherStrategiesPlannedBuyUsd: string
  competition: BuyCompetitionSummary | null   // 신규
}
```

숫자 필드(`availableDeposit`, `requiredForThisStrategy`, `consumedByHigherPriority`, `requiredBuyUsd`)는 기존 프로젝트 컨벤션대로 문자열로 유지 — 소비 시점에 `toNum()` 변환.

## 반영 절차 (프로젝트 컨벤션)

1. kista-api의 OpenAPI 스펙이 갱신된 뒤 `npm run gen:types` 실행 → `shared/lib/api-types.ts` 재생성
2. `shared/lib/api-schema.ts`에 필요한 타입/enum 참조 추가 (기존 `SkipReason` 재추출 패턴과 동일)
3. `entities/order/model/types.ts`에 위 인터페이스 추가
4. `entities/order/api/index.ts`의 `normalizePreview()`에 `competition` 파싱 로직 추가 — 없으면(undefined) `null`로 정규화, 있으면 각 필드 `String()`/구조 그대로 매핑, `blockedByHigherPriority` 배열은 원소별 매핑

## `StrategyDetail.tsx` 로직 변경

기존 계산 (제거 대상):
```ts
const totalBuyUsd = hasBuyOrders && !isMarginLoading
  ? orders.filter(o => o.direction === 'BUY').reduce((sum, o) => sum + toNum(o.price) * o.quantity, 0) : 0
const purchasableUsd = marginItems.find(i => i.currency === 'USD')?.purchasableAmount ?? 0
const otherPlannedUsd = toNum(preview?.otherStrategiesPlannedBuyUsd ?? '0')
const previewDeficit = hasBuyOrders && !isMarginLoading ? Math.max(0, totalBuyUsd + otherPlannedUsd - purchasableUsd) : 0
const hasDeficit = previewDeficit > 0
```

신규 계산:
```ts
const competition = preview?.competition ?? null
const hasDeficit = hasBuyOrders && competition ? !competition.sufficientBudget : false
const deficitUsd = competition
  ? Math.max(0, toNum(competition.consumedByHigherPriority) + toNum(competition.requiredForThisStrategy) - toNum(competition.availableDeposit))
  : 0
```

`useAccountMarginQuery`(`purchasableUsd`/`isMarginLoading` 출처)가 이 계산 외 다른 곳에서도 쓰이는지 페이지 전체를 확인 후:
- 다른 용도로 안 쓰이면 훅 호출 자체를 제거
- 다른 곳에서도 쓰이면 이 계산에서의 의존만 제거하고 훅은 유지

이유: `competition.availableDeposit`은 서버가 이미 라이브 브로커 잔고 기준으로 계산해 내려주므로, 클라이언트가 별도로 `useAccountMarginQuery`를 조합할 필요가 없어짐(중복 계산 제거).

## UI 컴포넌트

기존 배지 자리(데스크톱 233~238행, 모바일 320~325행)를 신규 로컬 컴포넌트로 교체 — 두 자리 모두 동일 컴포넌트를 재사용하되 각자 독립된 확장/축소 상태를 가짐(기존 데스크톱/모바일 이중 렌더 패턴 유지, 상태 공유 안 함).

표시 형태:
```
[Badge tone="warn"] 예수금 부족   $142.50 부족 (우선순위 전략 2개가 먼저 배정) [자세히 ▾]

(클릭 시 확장)
  • VR (TQQQ) — $900.00
  • INFINITE (SOXL) — $242.50
  ⚠ 일부 전략은 계산 불가로 정확하지 않을 수 있습니다   ← uncertainStrategyIds.length > 0일 때만
```

- 배지 텍스트/톤은 기존과 동일(`Badge tone="warn" size="sm"`, "예수금 부족")
- "$X 부족" 뒤에 "(우선순위 전략 N개가 먼저 배정)" 문구 추가, `N = blockedByHigherPriority.length`
- "자세히 ▾" 토글은 `blockedByHigherPriority`가 비어있지 않을 때만 표시
- 확장 시 각 항목을 `{type} ({ticker}) — ${requiredBuyUsd}` 형식으로 나열
- 접기/펼치기 구현은 기존 shadcn 구성 요소 중 재사용 가능한 프리미티브가 있으면 그것을 쓰고, 없으면 로컬 `useState` 토글로 구현 — 별도의 공용 Disclosure 프리미티브를 새로 만들지 않는다(YAGNI, 이번 사용처가 1곳뿐)
- `uncertainStrategyIds.length > 0`이면 확장 영역 하단에 작은 경고 문구(`text-xs text-muted` 등 기존 보조 텍스트 스타일) 추가

"바로 주문" 버튼 옆의 축약 배지("예수금 부족")와 클릭 시 `toast.info(...)` 안내는 기존 그대로 유지 — 판단 소스만 `hasDeficit`(신규 계산)로 교체.

## 엣지 케이스

- `hasBuyOrders && !competition` (서버 설계상 이 조합은 발생하지 않지만 방어적으로 처리): `hasDeficit = false`로 취급, 배지 미표시
- `competition.sufficientBudget === true`: 배지 없음 (기존과 동일)
- `blockedByHigherPriority`가 빈 배열인데 `sufficientBudget === false`: 설계상 발생하지 않음(부족하다면 최소 대상 전략 자신의 필요금액이 `availableDeposit`을 초과한 경우이므로 상위 경쟁자가 없어도 부족 판정 가능) — 이 경우 "자세히" 토글 자체를 숨김(빈 목록을 펼쳐도 보여줄 게 없으므로)
- `isMarginLoading` 관련 로딩 스켈레톤: `competition`은 `preview` 쿼리 자체의 일부이므로 별도 로딩 상태 불필요 — 기존 `preview` 로딩/스켈레톤 처리에 자연히 포함됨

## 테스트

- `normalizePreview()` 단위 테스트(있다면 해당 파일 컨벤션 따름): `competition` 필드가 `undefined`일 때 `null`로, populated일 때 필드별 정확히 매핑되는지
- `StrategyDetail`의 배지 표시 조건: `sufficientBudget=true`(배지 없음), `sufficientBudget=false`(배지 + 부족액 + 개수 문구), `blockedByHigherPriority` 확장 토글 동작, `uncertainStrategyIds` 유무에 따른 경고 문구 표시/미표시
