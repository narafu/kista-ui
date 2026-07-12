# React Query staleTime 소규모 수정 + CycleHistoryTable prop drilling 해소 — 설계 문서

## Context

트랙 B 백로그 중 kista-ui 쪽 2개 항목. 조사 결과 둘 다 원래 백로그 기록보다 스코프가 명확해졌다:

1. **React Query staleTime "정책 통일"** — 조사 결과 대부분의 훅은 이미 데이터 특성에 맞게 합리적인 값을 쓰고 있어 전면 리팩토링이 필요 없다. 실제 개선 여지는 3곳뿐이다.
2. **CycleHistoryTable 12개 prop drilling** — 3~4차 사이클(range 필터 reducer/UI 공용화)에서도 해소되지 않고 여전히 유효한 문제로 확인됐다. `StrategyTradesTab`/`TradesTab` 두 부모가 `useRangeFilterState()` + `resolveRangeStrict` + 쿼리 호출 + 12개 prop 나열을 거의 동일하게 중복하고 있다.

## 확정된 결정 사항

### 1. staleTime 소규모 수정 3건

- `entities/market/hooks/useMarketQueries.ts` — Fear&Greed 훅의 `staleTime: 30분` → `6시간`으로 상향, 주석을 실제 서버 주기(KST 00:00/12:00, 12시간)에 맞게 정정.
- 같은 파일의 `useMonthlyHolidaysQuery` — `staleTime: 1시간` → `24시간`으로 상향 (서버는 월 1회만 갱신).
- `entities/order/hooks/useOrderQueries.ts`의 `useStrategyOrdersQuery` — `staleTime` 미설정(기본 0) → `1분` 추가.

### 2. CycleHistoryTable을 자체 상태 소유 컴포넌트로 전환

`StrategyOrderHistory` 패턴(자체 상태 + 자체 쿼리 소유, 부모는 식별자만 전달)을 따른다. `StrategyTradesTab`/`TradesTab`는 `useRangeFilterState()`/`resolveRangeStrict`/쿼리 훅 호출을 전부 갖고 있는데, 두 쿼리 훅(`useStrategyCycleHistoryQuery`, `useAccountCycleHistoryQuery`) 모두 `(id, params)` 시그니처와 `{cycleHistory, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage}` 반환 형태가 동일함을 확인했다 — 쿼리 훅을 함수로 주입하는 방식으로 통합 가능하다.

`CycleHistoryTable`의 prop을 아래로 축소:
```ts
interface Props {
  title: string
  id: string | undefined
  useHistoryQuery: (id: string | undefined, params: RangeParams | null) => {
    cycleHistory: CycleHistoryItem[]
    isLoading: boolean
    fetchNextPage: () => void
    hasNextPage?: boolean
    isFetchingNextPage?: boolean
  }
  emptyIdMessage?: string  // id가 undefined일 때 표시할 메시지 (StrategyTradesTab 전용, TradesTab은 미사용)
}
```

`useRangeFilterState()` + `resolveRangeStrict` + `useHistoryQuery(id, params)` 호출을 `CycleHistoryTable` 내부로 이동. `StrategyTradesTab`/`TradesTab`는 각각 한 줄짜리 래퍼로 축소:
```tsx
export function StrategyTradesTab({ strategyId }: Props) {
  return <CycleHistoryTable title="잔고 이력" id={strategyId} useHistoryQuery={useStrategyCycleHistoryQuery} emptyIdMessage="전략이 없습니다." />
}
```

이러면 prop 개수가 12개(+3 옵셔널) → 4개로 줄고, 두 부모의 중복 보일러플레이트(훅 호출·params 조립)가 완전히 사라진다.

## 에러 처리

- 기존 `!strategyId` 조기 반환(EmptyState 렌더) 동작을 `emptyIdMessage` prop 유무로 재현 — `id`가 undefined이고 `emptyIdMessage`가 있으면 그 메시지로 EmptyState, 없으면(`TradesTab`처럼 `accountId`가 항상 정의됨) 그대로 진행.

## 테스트

- `CycleHistoryTable`에 대한 기존 테스트가 있다면(현재 파일 목록에서 미확인 — 계획 작성 시 재확인) props 변경에 맞게 갱신.
- `StrategyTradesTab`/`TradesTab` 렌더링 시 `typecheck`/`test`로 회귀 확인 — 시각적 변화 없음이 목표(순수 리팩토링).
- staleTime 3건은 로직 변경이 아니라 설정값 변경이라 별도 단위 테스트 불필요 — `typecheck`+`test` 통과로 충분.

## 범위 밖

- staleTime 전면 정책 문서화(`docs/agents` 등에 카테고리표 작성) — 3건 수정만으로 충분하다고 판단, 별도 문서 작성은 하지 않음.
- `CycleHistoryTable`의 테이블 마크업(모바일 카드/데스크탑 테이블) 자체는 변경하지 않음 — 데이터 소유 방식만 바뀜.
