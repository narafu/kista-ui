# 주문 취소 UI 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `NextOrderPreviewCard`에 수동 실행 취소 기능 추가 — 실행 후 카드가 "접수 완료" 상태로 전환되고 전체 취소(`DELETE /api/trading-cycles/{id}/execute`) 및 개별 취소(`DELETE /api/orders/{orderId}`) 버튼을 제공한다.

**Architecture:** `LoadState`에 `mode('preview'|'executed')` + `placedOrders` 추가. 실행 성공 시 execute 응답에서 orders 파싱(백엔드 미연동 시 빈 배열 폴백). `cancelAllOrders` / `cancelOneOrder` API 함수 신규 추가. `DELETE /api/orders/{orderId}` 를 위한 catch-all Route Handler 신규 생성.

**Tech Stack:** Next.js 15+ App Router, TypeScript, Tailwind CSS v4, Sonner toast, shadcn/ui

---

## 파일 목록

| 작업 | 파일 |
|---|---|
| Modify | `types/trade.ts` |
| Modify | `types/preview.ts` |
| Modify | `lib/api/strategies.ts` |
| Modify | `lib/api/orders.ts` |
| Create | `app/api/orders/[[...path]]/route.ts` |
| Modify | `components/common/NextOrderPreviewCard.tsx` |

---

## Task 1: 타입 정의 추가

**Files:**
- Modify: `types/trade.ts`
- Modify: `types/preview.ts`

- [ ] **Step 1: OrderStatus에 CANCELLED 추가**

`types/trade.ts` 3번째 줄을:

```typescript
export type OrderStatus = 'PLACED' | 'FILLED' | 'FAILED'
```

아래로 변경:

```typescript
export type OrderStatus = 'PLACED' | 'FILLED' | 'FAILED' | 'CANCELLED'
```

- [ ] **Step 2: PlacedOrder 인터페이스 추가**

`types/preview.ts` 끝에 추가:

```typescript
export interface PlacedOrder {
  id: string
  ticker: string
  direction: 'BUY' | 'SELL'
  orderType: string
  quantity: number
  price: string
}
```

- [ ] **Step 3: 타입 검사**

```bash
npm run typecheck
```

Expected: 오류 없음.

- [ ] **Step 4: 커밋**

```powershell
git add types/trade.ts types/preview.ts
git commit -m @'
feat: OrderStatus에 CANCELLED 추가, PlacedOrder 타입 정의

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Task 2: API 함수 추가

**Files:**
- Modify: `lib/api/strategies.ts`
- Modify: `lib/api/orders.ts`

- [ ] **Step 1: executeStrategy 반환 타입 변경 (strategies.ts)**

`lib/api/strategies.ts` 상단 import 변경 — `PlacedOrder` 임포트 추가:

```typescript
import { apiFetch, clientFetch } from './client'
import { toNum } from '@/lib/utils'
import type { CycleSeedType, Strategy, StrategyRequest } from '@/types/strategy'
import type { PlacedOrder } from '@/types/preview'
```

파일 끝의 `executeStrategy` 함수 전체를 교체:

```typescript
function normalizePlacedOrder(raw: unknown): PlacedOrder {
  const o = raw as Record<string, unknown>
  return {
    id: String(o.id),
    ticker: String(o.ticker),
    direction: String(o.direction) as 'BUY' | 'SELL',
    orderType: String(o.orderType),
    quantity: Number(o.quantity),
    price: String(o.price),
  }
}

export async function executeStrategy(id: string): Promise<PlacedOrder[]> {
  const raw = await clientFetch<{ orders?: unknown[] } | undefined>(
    `/api/trading-cycles/${id}/execute`,
    { method: 'POST' }
  )
  return (raw?.orders ?? []).map(normalizePlacedOrder)
}
```

> **참고:** 백엔드가 현재 202 + 빈 body를 반환하면 `clientFetch`가 `undefined`를 반환 → `raw?.orders`가 `undefined` → `[]` 폴백. 백엔드에서 `{ orders: [...] }` 추가 시 자동 연동됨.

- [ ] **Step 2: orders.ts에 취소 함수 추가**

`lib/api/orders.ts` 전체를 아래로 교체:

```typescript
import { clientFetch } from './client'
import type { NextOrderPreview, SkipReason } from '@/types/preview'

export interface CancelOrdersResult {
  cancelledCount: number
  failedCount: number
}

function normalizePreview(raw: unknown): NextOrderPreview {
  const r = raw as Record<string, unknown>
  const rawPos = r.position as Record<string, unknown> | null
  const orders = (r.orders as unknown[]).map((o) => {
    const item = o as Record<string, unknown>
    return {
      ticker: String(item.ticker),
      orderType: String(item.orderType),
      direction: String(item.direction),
      quantity: Number(item.quantity),
      price: String(item.price),
    }
  })
  const position = rawPos
    ? {
        ticker: String(rawPos.ticker),
        holdings: Number(rawPos.holdings),
        averagePrice: String(rawPos.averagePrice),
        currentPrice: String(rawPos.currentPrice),
        usdDeposit: String(rawPos.usdDeposit),
        totalAssets: String(rawPos.totalAssets),
        priceOffsetRate: String(rawPos.priceOffsetRate),
        currentRound: Number(rawPos.currentRound),
        unitAmount: String(rawPos.unitAmount),
        referencePrice: String(rawPos.referencePrice),
        targetPrice: String(rawPos.targetPrice),
      }
    : null
  const skipReason = (r.skipReason as SkipReason | null | undefined) ?? null
  return { tradeDate: String(r.tradeDate), position, orders, skipReason }
}

export async function getNextOrdersPreview(accountId: string): Promise<NextOrderPreview> {
  const raw = await clientFetch<unknown>(`/api/accounts/${accountId}/orders/preview`)
  return normalizePreview(raw)
}

// 오늘 PLACED된 주문 전체 취소 — DELETE /api/trading-cycles/{id}/execute
export async function cancelAllOrders(strategyId: string): Promise<CancelOrdersResult> {
  return clientFetch<CancelOrdersResult>(`/api/trading-cycles/${strategyId}/execute`, {
    method: 'DELETE',
  })
}

// 개별 주문 1건 취소 — DELETE /api/orders/{orderId}
export async function cancelOneOrder(orderId: string): Promise<void> {
  await clientFetch<void>(`/api/orders/${orderId}`, { method: 'DELETE' })
}
```

- [ ] **Step 3: 타입 검사**

```bash
npm run typecheck
```

Expected: 오류 없음.

- [ ] **Step 4: 커밋**

```powershell
git add lib/api/strategies.ts lib/api/orders.ts
git commit -m @'
feat: executeStrategy 반환 타입 PlacedOrder[]로 변경, cancelAllOrders/cancelOneOrder 추가

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Task 3: orders Route Handler 생성

**Files:**
- Create: `app/api/orders/[[...path]]/route.ts`

- [ ] **Step 1: 디렉토리 확인**

```bash
ls app/api/
```

`orders` 디렉토리가 없는 것을 확인.

- [ ] **Step 2: Route Handler 생성**

`app/api/orders/[[...path]]/route.ts` 신규 생성:

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAuthToken } from '@/lib/auth/token'

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL

type Params = { params: Promise<{ path?: string[] }> }

async function proxy(request: NextRequest, pathSegments: string[]) {
  const token = await getAuthToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subPath = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : ''
  const url = `${API_BASE_URL}/api/orders${subPath}${request.nextUrl.search}`
  const headers: HeadersInit = { Authorization: `Bearer ${token}` }

  const res = await fetch(url, {
    method: request.method,
    headers,
    signal: request.signal,
    cache: 'no-store',
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    console.error(`[orders${subPath} ${request.method}] ${res.status}`, errBody)
    return NextResponse.json({ error: 'Failed' }, { status: res.status })
  }

  if (res.status === 204) return new NextResponse(null, { status: 204 })
  return NextResponse.json(await res.json(), { status: res.status })
}

export async function GET(req: NextRequest, { params }: Params) {
  return proxy(req, (await params).path ?? [])
}
export async function DELETE(req: NextRequest, { params }: Params) {
  return proxy(req, (await params).path ?? [])
}
```

> **`trading-cycles` Route Handler 대비 차이점:** orders는 캐시 대상이 아니므로 `revalidateTag` 없음. body 전달(POST/PUT) 없으므로 content-type 처리 생략.

- [ ] **Step 3: 타입 검사**

```bash
npm run typecheck
```

Expected: 오류 없음.

- [ ] **Step 4: 커밋**

```powershell
git add "app/api/orders/[[...path]]/route.ts"
git commit -m @'
feat: DELETE /api/orders/{orderId} 프록시 Route Handler 추가

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## Task 4: NextOrderPreviewCard — executed 모드 추가

**Files:**
- Modify: `components/common/NextOrderPreviewCard.tsx`

- [ ] **Step 1: import 추가**

파일 상단 import 블록에서 기존 `executeStrategy` import 줄을 변경하고 취소 함수와 타입을 추가:

```typescript
// 변경 전
import {executeStrategy} from "@/lib/api/strategies";
import type {MarginItem} from "@/lib/api/accounts";
import type {NextOrderPreview} from "@/types/preview";

// 변경 후
import {executeStrategy} from "@/lib/api/strategies";
import {cancelAllOrders, cancelOneOrder} from "@/lib/api/orders";
import type {MarginItem} from "@/lib/api/accounts";
import type {NextOrderPreview, PlacedOrder} from "@/types/preview";
```

- [ ] **Step 2: LoadState / ExecState 타입 및 초기값 변경**

기존 타입 정의와 초기값을 아래로 교체:

```typescript
type LoadState = {
  preview: NextOrderPreview | null;
  margin: MarginItem[] | null;
  loading: boolean;
  error: "no-strategy" | "kis-fail" | null;
  lastUpdatedAt: string;
  mode: "preview" | "executed";
  placedOrders: PlacedOrder[];
};

const INITIAL_LOAD_STATE: LoadState = {
  preview: null,
  margin: null,
  loading: false,
  error: null,
  lastUpdatedAt: "",
  mode: "preview",
  placedOrders: [],
};

type ExecState = {
  open: boolean;
  running: boolean;
  cancelling: boolean;
  cancellingOrderId: string | null;
};

const INITIAL_EXEC_STATE: ExecState = {
  open: false,
  running: false,
  cancelling: false,
  cancellingOrderId: null,
};
```

- [ ] **Step 3: useState 초기값 및 구조분해 변경**

```typescript
// 변경 전
const [loadState, setLoadState] = useState<LoadState>(INITIAL_LOAD_STATE);
const [execState, setExecState] = useState({ open: false, running: false });
const { preview, margin, loading, error, lastUpdatedAt } = loadState;

// 변경 후
const [loadState, setLoadState] = useState<LoadState>(INITIAL_LOAD_STATE);
const [execState, setExecState] = useState<ExecState>(INITIAL_EXEC_STATE);
const { preview, margin, loading, error, lastUpdatedAt, mode, placedOrders } = loadState;
```

- [ ] **Step 4: load 함수 — mode/placedOrders 리셋 포함**

`load` callback 내 두 곳의 `setLoadState` 호출에 `mode: "preview", placedOrders: []` 추가:

```typescript
const load = useCallback(async () => {
  setLoadState((s) => ({ ...s, loading: true, error: null, margin: null }));
  try {
    const [data, marginData] = await Promise.all([
      getNextOrdersPreview(accountId),
      getMargin(accountId).catch(() => null),
    ]);
    setLoadState({
      preview: data,
      margin: marginData,
      loading: false,
      error: null,
      lastUpdatedAt: new Date().toLocaleTimeString("ko-KR"),
      mode: "preview",
      placedOrders: [],
    });
  } catch (e) {
    setLoadState({
      preview: null,
      margin: null,
      loading: false,
      error: e instanceof ApiError && e.status === 404 ? "no-strategy" : "kis-fail",
      lastUpdatedAt: "",
      mode: "preview",
      placedOrders: [],
    });
  }
}, [accountId]);
```

- [ ] **Step 5: handleExecute 변경 — 성공 시 executed 모드 전환**

기존 `handleExecute`를 아래로 교체:

```typescript
const handleExecute = useCallback(async () => {
  if (!strategyId) return;
  setExecState((s) => ({ ...s, running: true }));
  try {
    const orders = await executeStrategy(strategyId);
    toast.success("매매 실행이 요청됐습니다. 장 마감 후 체결 결과를 확인하세요.");
    setLoadState((s) => ({ ...s, mode: "executed", placedOrders: orders }));
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 409) {
        toast.error("오늘 이미 실행됐습니다.");
      } else if (e.status === 400) {
        toast.error("실행할 수 없는 전략입니다.");
      } else if (e.status === 403) {
        toast.error("권한이 없습니다.");
      } else {
        toast.error("실행 중 오류가 발생했습니다.");
      }
    } else {
      toast.error("실행 중 오류가 발생했습니다.");
    }
  } finally {
    setExecState((s) => ({ ...s, open: false, running: false }));
  }
}, [strategyId]);
```

- [ ] **Step 6: handleCancelAll / handleCancelOne 추가**

`handleExecute` 아래에 두 핸들러 추가:

```typescript
const handleCancelAll = useCallback(async () => {
  if (!strategyId) return;
  setExecState((s) => ({ ...s, cancelling: true }));
  try {
    const result = await cancelAllOrders(strategyId);
    if (result.failedCount === 0) {
      toast.success(`${result.cancelledCount}건 모두 취소됐습니다.`);
    } else {
      toast.warning(
        `${result.cancelledCount}건 취소, ${result.failedCount}건 실패 — KIS에서 직접 확인하세요.`
      );
    }
    setLoadState((s) => ({ ...s, mode: "preview", placedOrders: [] }));
    load();
  } catch {
    toast.error("취소 중 오류가 발생했습니다.");
  } finally {
    setExecState((s) => ({ ...s, cancelling: false }));
  }
}, [strategyId, load]);

const handleCancelOne = useCallback(async (orderId: string) => {
  setExecState((s) => ({ ...s, cancellingOrderId: orderId }));
  try {
    await cancelOneOrder(orderId);
    const remaining = placedOrders.filter((o) => o.id !== orderId);
    if (remaining.length === 0) {
      setLoadState((s) => ({ ...s, mode: "preview", placedOrders: [] }));
      load();
    } else {
      setLoadState((s) => ({ ...s, placedOrders: remaining }));
    }
  } catch {
    toast.error("주문 취소 중 오류가 발생했습니다.");
  } finally {
    setExecState((s) => ({ ...s, cancellingOrderId: null }));
  }
}, [placedOrders, load]);
```

- [ ] **Step 7: AlertDialog description 수정**

기존 description:
```typescript
취소할 수 없습니다.
```
포함된 줄을 찾아 아래로 교체:

```typescript
<AlertDialogDescription>
  오늘 날짜의 LOC 주문을 즉시 접수합니다. 장 마감 시 체결됩니다.
</AlertDialogDescription>
```

- [ ] **Step 8: AlertDialog onOpenChange / Action 수정**

`execState.open` 상태 참조가 `ExecState` 구조에 맞도록 유지되는지 확인. `setExecState` 호출을 아래로 통일:

```typescript
<AlertDialog open={execState.open} onOpenChange={(open) => setExecState((s) => ({ ...s, open }))}>
```

`AlertDialogAction`의 `onClick`과 `disabled`:

```typescript
<AlertDialogAction
  onClick={(e) => { e.preventDefault(); handleExecute(); }}
  disabled={execState.running}
  className="bg-rose-600 hover:bg-rose-700 text-white"
>
  {execState.running ? "실행 중..." : "실행"}
</AlertDialogAction>
```

- [ ] **Step 9: CardContent — executed 모드 UI 블록 추가**

`<CardContent>` 열린 태그 바로 다음, 기존 `{loading && !preview && ...}` 앞에 executed 블록 삽입:

```tsx
<CardContent>
  {/* ── executed 모드: 접수된 주문 목록 + 취소 버튼 ── */}
  {mode === "executed" && (
    <div className="space-y-3">
      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <p
            className="text-[11px] uppercase tracking-widest font-semibold"
            style={{ color: "var(--warn)" }}
          >
            ✓{" "}
            {placedOrders.length > 0
              ? `${placedOrders.length}건 접수됨`
              : "접수됨"}
          </p>
          <button
            type="button"
            onClick={handleCancelAll}
            disabled={execState.cancelling || execState.cancellingOrderId !== null}
            className="text-xs px-2.5 py-1 rounded-md bg-warn-bg text-warn hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            {execState.cancelling ? "취소 중..." : "전체 취소"}
          </button>
        </div>

        {placedOrders.length > 0 ? (
          <div className="divide-y divide-border">
            {placedOrders.map((order) => {
              const isBuy = order.direction === "BUY";
              const price = parseFloat(order.price);
              const total = price > 0 ? price * order.quantity : null;
              const isCancellingThis = execState.cancellingOrderId === order.id;
              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                      style={{
                        background: isBuy ? "var(--pos-bg)" : "var(--neg-bg)",
                        color: isBuy ? "var(--pos)" : "var(--neg)",
                      }}
                    >
                      {isBuy ? "매수" : "매도"}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      {order.orderType}
                    </span>
                    <span className="text-sm font-medium">{order.ticker}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {order.quantity}주
                        {price > 0 && ` × $${price.toFixed(2)}`}
                      </p>
                      {total != null && (
                        <p className="text-xs text-muted-foreground">
                          = ${total.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelOne(order.id)}
                      disabled={
                        execState.cancelling ||
                        execState.cancellingOrderId !== null
                      }
                      className="text-xs px-2 py-1 rounded-md border border-border text-muted-foreground hover:border-rose-300 hover:text-rose-600 transition-colors disabled:opacity-50"
                    >
                      {isCancellingThis ? "..." : "✕"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            접수된 주문 목록은 백엔드 업데이트 후 표시됩니다.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setLoadState((s) => ({ ...s, mode: "preview" }));
          load();
        }}
        className="w-full text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:border-rose-300 hover:text-rose-600 transition-colors"
      >
        ↩ 다시 미리보기
      </button>
    </div>
  )}

  {/* ── preview 모드: 기존 콘텐츠 (loading / error / preview 분기) ── */}
  {mode === "preview" && (
    <>
      {loading && !preview && (
        <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
          KIS에서 현재가와 잔고를 조회 중...
        </div>
      )}

      {error === "no-strategy" && (
        <p className="text-sm text-muted-foreground py-4 text-center">
          활성 전략이 없습니다.
        </p>
      )}

      {error === "kis-fail" && (
        <div className="flex flex-col items-center gap-3 py-4">
          <p className="text-sm text-muted-foreground text-center">
            KIS API 조회에 실패했습니다. 잠시 후 다시 시도해주세요.
          </p>
          <button
            type="button"
            onClick={load}
            className="text-xs px-3 py-1.5 rounded-md border border-border hover:border-rose-300 hover:text-rose-600 transition-colors"
          >
            재시도
          </button>
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          {showInsufficientBanner && (
            <div className="rounded-lg px-4 py-2.5 bg-warn-bg">
              <p className="text-xs font-semibold text-warn leading-relaxed">
                ⚠️ 매수 예정 금액 ${totalBuy.toFixed(2)} • 예수금 $
                {(purchasable ?? 0).toFixed(2)} • 잔고 부족 $
                {shortfall.toFixed(2)}
              </p>
            </div>
          )}

          {pos && (
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="회차(T)" value={`${pos.currentRound.toFixed(1)}회차`} />
              <KpiCard label="단위금액(회)" value={`$${parseFloat(pos.unitAmount).toFixed(2)}`} />
              <KpiCard label="기준가(별% 가격)" value={`$${parseFloat(pos.referencePrice).toFixed(2)}`} />
              <KpiCard label="목표가" value={`$${parseFloat(pos.targetPrice).toFixed(2)}`} />
            </div>
          )}

          {preview.orders.length === 0 ? (
            preview.skipReason === "INSUFFICIENT_BALANCE" &&
            insufficientShortfall !== null ? (
              <div className="rounded-lg px-4 py-2.5 bg-warn-bg">
                <p className="text-xs font-semibold text-warn leading-relaxed">
                  ⚠️ 단위금액 ${insufficientUnitAmount!.toFixed(2)} • 현재가 $
                  {insufficientCurrentPrice!.toFixed(2)} • 부족 $
                  {insufficientShortfall.toFixed(2)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-3">
                {preview.skipReason === "NO_CYCLE_HISTORY" &&
                  "첫 자동 매매 전에는 미리보기를 계산할 수 없습니다."}
                {preview.skipReason === "INSUFFICIENT_BALANCE" &&
                  "잔고 부족으로 이번 사이클은 건너뜁니다."}
                {preview.skipReason === "NO_PRIVACY_BASE" &&
                  "오늘의 기준 매매표가 아직 수신되지 않았습니다."}
                {!preview.skipReason && "이번 사이클은 예정된 주문이 없습니다."}
              </p>
            )
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-widest text-rose-500 font-semibold">
                예정 주문 {preview.orders.length}건
              </p>
              {preview.orders.map((order, i) => {
                const isBuy = order.direction === "BUY";
                const price = parseFloat(order.price);
                const total = price > 0 ? price * order.quantity : null;
                return (
                  <div
                    key={`${order.ticker}-${order.direction}-${order.orderType}-${i}`}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                        style={{
                          background: isBuy ? "var(--pos-bg)" : "var(--neg-bg)",
                          color: isBuy ? "var(--pos)" : "var(--neg)",
                        }}
                      >
                        {isBuy ? "매수" : "매도"}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        {order.orderType}
                      </span>
                      <span className="text-sm font-medium">{order.ticker}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {order.quantity}주
                        {price > 0 && ` × $${price.toFixed(2)}`}
                      </p>
                      {total != null && (
                        <p className="text-xs text-muted-foreground">
                          = ${total.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  )}
</CardContent>
```

- [ ] **Step 10: 타입 검사**

```bash
npm run typecheck
```

Expected: 오류 없음.

- [ ] **Step 11: 커밋**

```powershell
git add components/common/NextOrderPreviewCard.tsx
git commit -m @'
feat(preview): 수동 실행 취소 UI 추가 — executed 모드 상태 전환, 전체/개별 취소 버튼

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
'@
```

---

## 검증 체크리스트

- [ ] `npm run typecheck` 오류 없음
- [ ] `npm run dev` 개발 서버 기동 (포트 확인: `cat /tmp/kista_dev.log | grep "Local:"`)
- [ ] INFINITE ACTIVE 전략이 있는 계좌 상세 → "다음 주문" 탭 확인
- [ ] "지금 실행" 클릭 → AlertDialog → "실행" → 카드가 executed 모드로 전환 확인
- [ ] executed 모드에서 "전체 취소" 클릭 → toast 확인 → preview 모드 복귀 확인
- [ ] executed 모드에서 "↩ 다시 미리보기" 클릭 → preview 모드 복귀 확인
- [ ] 백엔드 orders 미연동 시: executed 모드에서 "접수된 주문 목록은 백엔드 업데이트 후 표시됩니다" 문구 표시 + 전체 취소 버튼만 노출
