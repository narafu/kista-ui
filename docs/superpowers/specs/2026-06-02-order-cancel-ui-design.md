# 주문 취소 UI 설계

**날짜**: 2026-06-02  
**배경**: 백엔드에 수동 실행 취소 API 추가(`DELETE /api/trading-cycles/{id}/execute`, `DELETE /api/orders/{orderId}`)됨에 따라 프론트엔드 UI 대응 개발.

---

## 개요

`NextOrderPreviewCard`에 수동 실행 취소 기능을 추가한다. 실행(`지금 실행`) 직후 카드가 "접수 완료" 상태로 전환되며, **전체 취소** 버튼과 **개별 ✕ 취소** 버튼을 제공한다.

---

## 카드 상태 모델

```
preview  ──[지금 실행 성공]──→  executed
executed ──[전체/개별 취소 완료]──→  preview
executed ──[↩ 다시 미리보기 클릭]──→  preview
```

| 상태 | 보여주는 것 |
|---|---|
| `preview` | 기존 예정 주문 목록 + "지금 실행" 버튼 (변경 없음) |
| `executed` | PLACED 주문 목록 + "전체 취소" 버튼 + 행별 ✕ 버튼 |

### PlacedOrder 타입 (신규)

```typescript
export interface PlacedOrder {
  id: string          // orderId — DELETE /api/orders/{id} 에 사용
  ticker: string
  direction: 'BUY' | 'SELL'
  orderType: string   // 'LOC' | 'MOC' | 'LIMIT'
  quantity: number
  price: string
}
```

---

## API 레이어

### 1. `executeStrategy()` 반환 타입 변경 (`lib/api/strategies.ts`)

현재 반환값 없음 → `PlacedOrder[]` 반환으로 변경.  
백엔드가 응답 body에 orders를 추가하기 전까지는 빈 배열(`[]`)로 정규화.

```typescript
// 변경 전
async function executeStrategy(id: string): Promise<void>

// 변경 후
async function executeStrategy(id: string): Promise<PlacedOrder[]>
// 백엔드 응답: { orders?: PlacedOrder[] } — 필드 없으면 [] 반환
```

### 2. 취소 함수 신규 추가 (`lib/api/orders.ts`)

```typescript
// 사이클 전체 취소 — DELETE /api/trading-cycles/{id}/execute
// 응답: { cancelledCount: number, failedCount: number }
async function cancelAllOrders(strategyId: string): Promise<CancelOrdersResult>

// 개별 주문 취소 — DELETE /api/orders/{orderId}
// 응답: 204 (void)
async function cancelOneOrder(orderId: string): Promise<void>

export interface CancelOrdersResult {
  cancelledCount: number
  failedCount: number
}
```

두 함수 모두 `clientFetch` 경유 (token 없음, Route Handler 자동 사용).

### 3. Route Handler — `app/api/orders/[[...path]]/route.ts` (신규)

`DELETE /api/orders/{orderId}`를 kista-api로 프록시.  
기존 `trading-cycles/[[...path]]` catch-all이 `DELETE /api/trading-cycles/{id}/execute`를 이미 처리함 — 별도 Route Handler 불필요.

---

## NextOrderPreviewCard 변경

### 상태 추가

```typescript
// 기존 LoadState에 추가
type LoadState = {
  preview: NextOrderPreview | null
  margin: MarginItem[] | null
  loading: boolean
  error: string | null
  lastUpdatedAt: Date | null
  mode: 'preview' | 'executed'   // 신규
  placedOrders: PlacedOrder[]    // 신규 — execute 응답에서 수신
}

// 기존 ExecState에 추가
type ExecState = {
  open: boolean
  running: boolean
  cancelling: boolean            // 신규 — 취소 진행 중 (전체 버튼 비활성화용)
  cancellingOrderId: string | null  // 신규 — 개별 ✕ 진행 중인 orderId
}
```

### handleExecute 변경

성공 시 응답에서 `placedOrders` 수신 → `mode = 'executed'`로 전환.  
백엔드 응답에 orders 없는 경우(추후 변경 전) `[]`로 폴백 → `mode = 'executed'`는 유지 (전체 취소 버튼은 노출, 개별 ✕는 미노출).

```typescript
const orders = result?.orders ?? []
dispatch({ ...state, mode: 'executed', placedOrders: orders })
```

### handleCancelAll (신규)

1. `cancelling = true`
2. `cancelAllOrders(strategyId)` 호출
3. 결과 분기:
   - `failedCount === 0` → `toast.success("N건 모두 취소됐습니다")`
   - `failedCount > 0` → `toast.warning("N건 취소, M건 실패 — KIS에서 직접 확인하세요")`
4. `mode = 'preview'`, `load()` 재호출

### handleCancelOne(orderId) (신규)

1. `cancellingOrderId = orderId`
2. `cancelOneOrder(orderId)` 호출
3. `placedOrders`에서 해당 orderId 제거
4. `placedOrders.length === 0` → `mode = 'preview'`, `load()`

### executed 모드 UI

```
┌─────────────────────────────────────┐
│ 다음 주문 미리보기       [접수됨 뱃지] │
│ ┌─────────────────────────────────┐ │
│ │ ✓ 2건 접수됨    [전체 취소 버튼] │ │
│ │ 매수 TQQQ 3주 · LOC      [✕]   │ │
│ │ 매도 SOXL 5주· LOC       [✕]   │ │
│ └─────────────────────────────────┘ │
│ [↩ 다시 미리보기]                    │
└─────────────────────────────────────┘
```

- `전체 취소`: `bg-warn-bg text-warn` 스타일 (경고 톤), `cancelling` 중 disabled
- `✕`: 투명 배경, `cancellingOrderId === orderId` 중 스피너
- `↩ 다시 미리보기`: `mode = 'preview'` 전환 (취소 없이 화면만 복귀)
- `placedOrders.length === 0` (백엔드 orders 미구현 시): 전체 취소 버튼만 노출, "주문 목록은 백엔드 연동 후 표시됩니다" 안내 없음 — 버튼만 있어도 기능은 동작함

---

## 타입 변경

`types/trade.ts`의 `OrderStatus`에 `CANCELLED` 추가:

```typescript
export type OrderStatus = 'PLACED' | 'FILLED' | 'FAILED' | 'CANCELLED'
```

---

## 수정 파일 목록

| 작업 | 파일 |
|---|---|
| Modify | `types/trade.ts` — OrderStatus에 CANCELLED 추가 |
| Modify | `types/preview.ts` — PlacedOrder 인터페이스 추가 |
| Modify | `lib/api/strategies.ts` — executeStrategy 반환 타입 변경 |
| Modify | `lib/api/orders.ts` — cancelAllOrders, cancelOneOrder 추가 + CancelOrdersResult 타입 |
| Create | `app/api/orders/[[...path]]/route.ts` — DELETE proxy Route Handler |
| Modify | `components/common/NextOrderPreviewCard.tsx` — executed 모드 UI + 상태 + 핸들러 |

---

## 백엔드 의존 사항

| 항목 | 상태 | 비고 |
|---|---|---|
| `DELETE /api/trading-cycles/{id}/execute` | 백엔드 구현 후 연동 가능 | 기존 catch-all Route Handler가 처리 |
| `DELETE /api/orders/{orderId}` | 백엔드 구현 후 연동 가능 | 신규 Route Handler 필요 |
| `POST /execute` 응답 body에 orders 추가 | **추후 변경** | 없으면 개별 ✕ 비노출, 전체 취소만 동작 |

---

## 검증 계획

1. `npm run typecheck` — 오류 없음
2. 로컬 개발 서버 기동 후:
   - `지금 실행` 클릭 → 카드가 executed 모드로 전환 확인
   - `전체 취소` 클릭 → toast 확인, 카드가 preview 모드로 복귀 확인
   - `✕` 클릭 → 해당 행 제거 확인 (백엔드 orders 연동 후 테스트 가능)
   - `↩ 다시 미리보기` 클릭 → preview 모드 복귀 확인
3. INFINITE 전략만 실행 버튼이 있으므로 INFINITE 계좌에서 테스트
4. 부분 실패 시나리오: 백엔드 모의 응답 `{cancelledCount:1, failedCount:1}` → warning toast 확인
