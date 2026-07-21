# 바로주문/미리보기 정리 (UI)

> kista-api companion: `../../../kista-api/docs/superpowers/specs/2026-07-21-direct-order-preview-cleanup-api-design.md`
> 관련 선행 스펙: `2026-07-18-buy-competition-preview-ui-design.md`, `2026-07-18-strategy-card-deficit-accuracy-design.md`(카드 예산부족 배지의 존재 이유), `2026-07-21-order-rejection-banner-frontend-diff-design.md`(오늘 오전 추가한 `unplacedDirections` 배너 — 이번 작업에서 무변경)

## 배경

"바로주문/미리보기" 영역을 사용자 요청으로 다시 훑었다. 실제로 남아있던 문제 두 가지:

1. **`manualOrders` 섀도우 상태** — `StrategyDetail.tsx`의 "바로 주문" 실행(`useExecuteStrategyMutation`)이 `order-preview` 쿼리 무효화를 안 해서, 화면이 로컬 `manualOrders` state와 서버 `preview.todayOrders` 두 소스를 병합해 `mode`/`placedOrders`를 파생시킨다. git log로 확인한 결과 이건 의도된 설계가 아니라 `chore(react-doctor): false positive 23개 파일 eslint-disable 주석 추가`(2026-06-27) 일괄 커밋에서 린터가 정확히 지적한 무효화 누락을 false positive로 오판해 억제해버린 잔재다.
2. **예수금 부족액 표시 소실** — 오늘 오전 `BuyCompetitionNotice.tsx`를 제거(`2026-07-21-order-rejection-banner-frontend-diff-design.md`)하면서, 그 컴포넌트가 보여주던 `deficitUsd`(`$120 부족` 같은 구체 금액) 표시도 같이 사라졌다. 당시 advisor 리뷰에서 "쓰이지 않는 죽은 코드"로 판단해 계산 자체를 지웠는데, 실제로는 유일한 소비처(`BuyCompetitionNotice`)를 지운 부작용이었을 뿐 계산 자체는 여전히 필요했다.

**검토했지만 채택하지 않은 방향**: `StrategyCard.tsx`가 카드마다 독립적으로 무거운 `/preview`(경쟁 시뮬레이션 포함)를 호출하는 비용을 줄이려고, 카드 전용 경량 엔드포인트로 교체하는 안을 검토했다. 하지만 카드의 예산부족 배지(`hasDeficit`)는 `2026-07-18-strategy-card-deficit-accuracy-design.md`에서 이미 밝혔듯 "SELL만 성공해도 무조건 녹색으로 보이는" 버그의 안전장치이기도 하다. 경량 엔드포인트로 교체하면 이 안전장치가 사라져 그 버그가 재발하므로 폐기했다. 대신 `staleTime`으로 재조회 빈도만 낮춘다 — 안전장치·정확도는 100% 유지, 데이터·계산 로직은 무변경.

## 설계

### 1. `useStrategyOrderPreviewQuery`에 `staleTime` 추가

`entities/order/hooks/useOrderQueries.ts`:

```ts
export function useStrategyOrderPreviewQuery(strategyId: string) {
  return useQuery<NextOrderPreview>({
    queryKey: ['order-preview', 'strategy', strategyId],
    queryFn: () => getStrategyOrdersPreview(strategyId),
    retry: false,
    staleTime: 60_000, // 목록 페이지 재진입 시 캐시 재사용 — 카드 N개가 매번 재조회하는 비용 완화
  })
}
```

`StrategyCard.tsx`/`StrategyDetail.tsx` 양쪽이 같은 훅을 쓰므로 한 곳만 고치면 전부 적용된다. `StrategyDetail.tsx`의 "바로 주문"/"전체 취소"/"주문 취소"는 이미 `invalidateQueries`로 강제 갱신하므로(위 2번 수정 포함) `staleTime`이 사용자 액션 직후 신선도를 막지 않는다.

### 2. `manualOrders` 섀도우 상태 제거

`entities/strategy/hooks/useStrategyQueries.ts`:

```ts
// BEFORE
export function useExecuteStrategyMutation(strategyId: string | undefined) {
  return useMutation({ // eslint-disable-line react-doctor/query-mutation-missing-invalidation
    mutationFn: () => executeStrategy(strategyId!),
    onSuccess: () => toast.success('매매 실행이 요청됐습니다. 장 마감 후 체결 결과를 확인하세요.'),
    ...

// AFTER
export function useExecuteStrategyMutation(strategyId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => executeStrategy(strategyId!),
    onSuccess: () => {
      toast.success('매매 실행이 요청됐습니다. 장 마감 후 체결 결과를 확인하세요.')
      queryClient.invalidateQueries({ queryKey: ['order-preview', 'strategy', strategyId] })
    },
    ...
```

`widgets/strategy-detail/StrategyDetail.tsx`:

```ts
// BEFORE
const [manualOrders, setManualOrders] = useState<PlacedOrder[] | null>(null)
const { data: preview, ... } = useStrategyOrderPreviewQuery(strategy.id)
const serverOrders = preview?.todayOrders ?? []
const hasServerOrders = serverOrders.length > 0
const placedOrders = manualOrders ?? (hasServerOrders ? serverOrders : [])
const mode: 'preview' | 'executed' = manualOrders !== null || hasServerOrders ? 'executed' : 'preview'

// AFTER
const { data: preview, ... } = useStrategyOrderPreviewQuery(strategy.id)
const placedOrders = preview?.todayOrders ?? []
const mode: 'preview' | 'executed' = placedOrders.length > 0 ? 'executed' : 'preview'
```

`handleCancelOne`(로컬 `manualOrders` 필터링), `executeMutation.mutate`의 `onSuccess: (placed) => setManualOrders(placed)`, `cancelAllMutation`의 `setManualOrders(null)` 호출부도 함께 제거 — 취소 훅들은 이미 `order-preview` 무효화를 하므로(`entities/order/hooks/useOrderQueries.ts`, 기존 그대로) 재조회만으로 반영된다. `import type { SkipReason, PlacedOrder } from '@entities/order'`(`:32`)의 `PlacedOrder`는 `manualOrders` state 선언(`:58`)에서만 쓰이던 타입이라 함께 제거 — 확인 결과 이 파일 내 다른 사용처 없음(`grep -n "PlacedOrder" StrategyDetail.tsx` 결과 두 줄뿐).

**트레이드오프**: 지금은 실행·취소 클릭 시 로컬 state로 즉시 갱신되지만, 제거 후엔 무효화 → 재조회 완료까지 짧은 지연이 생긴다. 로컬 API 기준 체감은 거의 없을 것으로 보고 받아들인다(사용자 확인 완료).

### 3. 예수금 부족액 표시 복원

`widgets/strategy-detail/StrategyDetail.tsx`, 기존 `hasDeficit`/`competition` 파생 바로 아래에 추가:

```ts
const competition = preview?.competition ?? null
const hasDeficit = hasBuyOrders && competition ? !competition.sufficientBudget : false
// 우선순위 앞선 경쟁 전략 소요액 + 이 전략 필요액 - 가용예수금 = 부족액 (오늘 오전 컴포넌트 제거 시 실수로 함께 지워짐, 복원)
const previewDeficit = competition
  ? Math.max(0, toNum(competition.consumedByHigherPriority) + toNum(competition.requiredForThisStrategy) - toNum(competition.availableDeposit))
  : 0
```

배지 표시부(`:245-247` 부근, `{(isHoliday || hasDeficit) && (<Badge tone="warn" size="sm">...`):

```jsx
// BEFORE
{(isHoliday || hasDeficit) && (
  <Badge tone="warn" size="sm">{isHoliday ? '휴장일' : '예수금 부족'}</Badge>
)}

// AFTER
{(isHoliday || hasDeficit) && (
  <Badge tone="warn" size="sm">
    {isHoliday ? '휴장일' : `예수금 부족 ($${fmtUsd(previewDeficit)} 부족)`}
  </Badge>
)}
```

`toNum`은 이미 import돼 있음(포지션 KPI 카드에서 사용 중). 별도 컴포넌트(`BuyCompetitionNotice`류)는 재도입하지 않는다 — "우선순위 전략 목록 펼쳐보기" 같은 부가 UI는 이번 범위 밖(사용자 확인 완료).

`StrategyCard.tsx`는 이번 라운드에서 **무변경** — 기존 `hasBuyOrders`/`competition`/`hasDeficit`/`orderBorderColor` 로직 그대로 유지.

## 테스트 계획

- `entities/strategy/hooks/useStrategyQueries.test.ts`(있다면) 또는 신규: `useExecuteStrategyMutation` 성공 시 `['order-preview', 'strategy', strategyId]` 무효화 호출 검증.
- `StrategyDetail.test.tsx`:
  - 기존 `manualOrders` 관련 테스트(있다면)를 서버 `preview.todayOrders` 단일 소스 기준으로 재작성 — "바로 주문" 성공 시 `executeStrategy` 목이 반환한 값이 아니라 재조회된 `preview.todayOrders`로 `mode`/`placedOrders`가 갱신되는지 확인
  - `competition.sufficientBudget=false`일 때 배지에 구체 금액(`$X 부족`)이 렌더링되는지 신규 검증 — `previewDeficit` 계산식 그대로 값 대입해 정확한 문자열 확인
  - 기존 `unplacedDirections` 배너 테스트 4건은 무변경으로 통과해야 함(회귀 없음 확인용으로 재실행)
- `StrategyCard.test.tsx`: 무변경 확인만(회귀 없음).
- `npx tsc --noEmit`, `npx vitest run`.

## 구현 범위 요약

- 수정: `entities/order/hooks/useOrderQueries.ts`(`staleTime`), `entities/strategy/hooks/useStrategyQueries.ts`(`useExecuteStrategyMutation` 무효화 추가), `widgets/strategy-detail/StrategyDetail.tsx`(`manualOrders` 제거, `previewDeficit` 복원)
- 수정(테스트): `StrategyDetail.test.tsx`, 필요 시 `useStrategyQueries` 테스트
- 무변경: `StrategyCard.tsx`, `entities/order/api/index.ts`, `unplacedDirections` 배너 로직, kista-api 응답 구조(필드명 리네임은 API 내부 전용, JSON 키 무변경)
