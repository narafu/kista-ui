'use client'

import { useMemo, useState, type FormEvent } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAdminReorderBuyBudgetQueries } from '@entities/admin'
import type { AdminReorderBuyBudget, AdminReorderTimingAvailability, AdminStrategyOrder } from '@entities/admin'
import { ORDER_STATUS_LABEL } from '@entities/order'
import type { OrderDirection } from '@shared/lib/api-schema'
import { fmtUsd, todayKst } from '@shared/lib/format'

export interface ReorderBatchItem {
  orderId: string
  timing: 'AT_OPEN' | 'AT_CLOSE' | 'IMMEDIATE'
  direction: OrderDirection
  quantity: number
  price: number
  memo?: string
}

interface OrderDraft {
  timing: 'AT_OPEN' | 'AT_CLOSE' | 'IMMEDIATE'
  quantity: string
  price: string
  memo: string
}

interface Props {
  orders: AdminStrategyOrder[]
  disabled: boolean
  timingAvailability: AdminReorderTimingAvailability
  onSubmit: (items: ReorderBatchItem[]) => Promise<void>
}

const TIMING_OPTIONS: {
  value: 'AT_OPEN' | 'AT_CLOSE' | 'IMMEDIATE'
  label: string
  availKey: keyof AdminReorderTimingAvailability
}[] = [
  { value: 'AT_OPEN',   label: '개장 접수 (AT_OPEN)',  availKey: 'atOpen' },
  { value: 'AT_CLOSE',  label: '마감 접수 (AT_CLOSE)', availKey: 'atClose' },
  { value: 'IMMEDIATE', label: '즉시 접수',             availKey: 'immediate' },
]

function getDefaultTiming(avail: AdminReorderTimingAvailability): 'AT_OPEN' | 'AT_CLOSE' | 'IMMEDIATE' {
  if (avail.atOpen) return 'AT_OPEN'
  if (avail.atClose) return 'AT_CLOSE'
  if (avail.immediate) return 'IMMEDIATE'
  return 'AT_CLOSE' // BLOCKED — 서버 측에서 최종 검증
}

function buildInitialDrafts(orders: AdminStrategyOrder[], avail: AdminReorderTimingAvailability) {
  const defaultTiming = getDefaultTiming(avail)
  return Object.fromEntries(
    orders.map((order) => [
      order.id,
      {
        timing: defaultTiming,
        quantity: String(order.quantity),
        price: String(order.price),
        memo: '',
      } satisfies OrderDraft,
    ]),
  ) as Record<string, OrderDraft>
}

interface BudgetQueryState {
  data?: AdminReorderBuyBudget
  isPending: boolean
  isError: boolean
}

type BuyBudgetSummary =
  | { state: 'loading' }
  | { state: 'unknown' }
  | { state: 'ok'; remaining: number; required: number; over: boolean }

// 남은 예산 = liveOrderable − plannedBuy(계좌 공통, 한 번만) + Σ 재주문할 BUY 원본의 sourceRefund.
// 재주문하지 않는 행은 원본이 취소되지 않으므로 refund를 더하지 않는다.
// ponytail: 폼의 주문은 모두 선택된 한 계좌 소속이라 계좌별 그룹핑 없음 — 다계좌 폼이 생기면 accountId로 묶을 것
function summarizeBuyBudget(
  allBuy: BudgetQueryState[],
  targets: { query: BudgetQueryState; amount: number }[],
): BuyBudgetSummary {
  const relevant = targets.length > 0 ? targets.map((t) => t.query) : allBuy
  if (relevant.some((q) => q.isError)) return { state: 'unknown' }
  if (relevant.some((q) => q.isPending)) return { state: 'loading' }
  // 주문마다 live 잔고를 따로 조회하므로 일부만 실패할 수 있다 — 성공한 응답 하나면 충분
  const base = relevant.find((q) => q.data?.liveOrderable != null)?.data
  if (base?.liveOrderable == null) return { state: 'unknown' }
  const refund = targets.reduce((sum, t) => sum + (t.query.data?.sourceRefund ?? 0), 0)
  const remaining = base.liveOrderable - base.plannedBuy + refund
  const required = targets.reduce((sum, t) => sum + t.amount, 0)
  return { state: 'ok', remaining, required, over: targets.length > 0 && required - remaining > 0.005 }
}

function isDraftChanged(current: OrderDraft, initial: OrderDraft): boolean {
  return (
    current.timing !== initial.timing ||
    current.quantity !== initial.quantity ||
    current.price !== initial.price ||
    current.memo !== initial.memo
  )
}

export function AdminBatchOrderCorrectionForm({ orders, disabled, timingAvailability, onSubmit }: Props) {
  const [initialDrafts] = useState<Record<string, OrderDraft>>(() => buildInitialDrafts(orders, timingAvailability))
  const [drafts, setDrafts] = useState<Record<string, OrderDraft>>(() => initialDrafts)

  const isBlocked = useMemo(
    () => !timingAvailability.atOpen && !timingAvailability.atClose && !timingAvailability.immediate,
    [timingAvailability],
  )

  const changedOrderIds = useMemo(
    () => orders.flatMap((order) => {
      const current = drafts[order.id]
      const initial = initialDrafts[order.id]
      return current != null && initial != null && isDraftChanged(current, initial) ? [order.id] : []
    }),
    [orders, drafts, initialDrafts],
  )
  const changedSet = useMemo(() => new Set(changedOrderIds), [changedOrderIds])
  const [confirmOpen, setConfirmOpen] = useState(false)

  // 재주문 POST와 같은 거래일(todayKst) 기준 — 날짜가 바뀌면 queryKey가 달라져 재조회된다
  const buyOrders = orders.filter((order) => order.direction === 'BUY')
  const budgetQueries = useAdminReorderBuyBudgetQueries(buyOrders.map((order) => order.id), todayKst())
  const budget = buyOrders.length === 0 ? null : summarizeBuyBudget(
    budgetQueries,
    buyOrders.flatMap((order, index) => {
      if (!changedSet.has(order.id)) return []
      const draft = drafts[order.id]
      return [{ query: budgetQueries[index]!, amount: Number(draft?.price) * Number(draft?.quantity) || 0 }]
    }),
  )
  const hasChangedBuy = buyOrders.some((order) => changedSet.has(order.id))

  const handleDraftChange = (orderId: string, key: keyof OrderDraft, value: string) => {
    setDrafts((current) => ({
      ...current,
      [orderId]: {
        ...(current[orderId] ?? {
          timing: getDefaultTiming(timingAvailability),
          quantity: '',
          price: '',
          memo: '',
        }),
        [key]: value,
      },
    }))
  }

  const submitItems = async () => {
    const items: ReorderBatchItem[] = orders.flatMap((order) => {
      if (!changedSet.has(order.id)) return []
      const draft = drafts[order.id]!
      return [{
        orderId: order.id,
        timing: draft.timing,
        direction: order.direction,
        quantity: Number(draft.quantity),
        price: Number(draft.price),
        memo: draft.memo.trim() || undefined,
      }]
    })

    if (items.length === 0) return
    await onSubmit(items)
  }

  // 예산 초과는 차단하지 않고 확인 후 진행한다 — 서버도 차단하지 않는다
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (budget?.state === 'ok' && budget.over) {
      setConfirmOpen(true)
      return
    }
    await submitItems()
  }

  if (orders.length === 0) return null

  return (
    <form className="mt-4 rounded-[var(--r-lg)] border border-border bg-muted/10 p-4" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">거래일 주문 일괄 재주문</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            조회된 주문 {orders.length}건을 같은 요청 흐름에서 순차 재주문합니다.
          </p>
        </div>
        {isBlocked && (
          <div className="rounded-[var(--r-md)] border border-dashed border-warn bg-warn-bg px-3 py-2 text-xs text-warn">
            현재 시장 단계(장마감~프리마켓 전)에서는 접수 가능한 주문시점이 없습니다.
          </div>
        )}
      </div>

      {budget && (
        <div aria-live="polite" className="mt-3 space-y-2 text-sm">
          {budget.state === 'loading' && (
            <p className="text-muted-foreground">남은 주문가능금액 조회 중...</p>
          )}
          {budget.state === 'unknown' && (
            <p className="rounded-[var(--r-md)] border border-dashed border-warn bg-warn-bg px-3 py-2 text-warn">
              주문가능금액 조회 실패 — 예산 확인 불가
            </p>
          )}
          {budget.state === 'ok' && (
            <>
              <p className="text-muted-foreground">
                남은 주문가능금액 <span className="font-semibold text-foreground">${fmtUsd(budget.remaining)}</span>
                {hasChangedBuy && <> · 변경한 BUY 합계 <span className="font-semibold text-foreground">${fmtUsd(budget.required)}</span></>}
              </p>
              {budget.over && (
                <p className="rounded-[var(--r-md)] border border-dashed border-warn bg-warn-bg px-3 py-2 text-warn">
                  변경한 BUY 주문 합계가 남은 주문가능금액을 ${fmtUsd(budget.required - budget.remaining)} 초과합니다. 그대로 진행하면 증권사에서 거절될 수 있습니다.
                </p>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {orders.map((order) => {
          const draft = drafts[order.id] ?? {
            timing: getDefaultTiming(timingAvailability),
            quantity: String(order.quantity),
            price: String(order.price),
            memo: '',
          }

          const isChanged = changedSet.has(order.id)
          return (
            <section key={order.id} className={`rounded-[var(--r-md)] border bg-background p-3 ${isChanged ? 'border-primary' : 'border-border'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{order.direction} · {order.orderType}</span>
                <span className="text-muted-foreground">· {order.quantity}주</span>
                <span className="text-muted-foreground">· {order.ticker}</span>
                {isChanged && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    변경됨
                  </span>
                )}
                <span className="ml-auto inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {ORDER_STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>

              <div className="mt-3">
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">주문시점</span>
                  <select
                    aria-label={`${order.id} 주문시점`}
                    value={draft.timing}
                    onChange={(e) => handleDraftChange(order.id, 'timing', e.target.value)}
                    disabled={disabled || isBlocked}
                    className="h-10 rounded-[var(--r-md)] border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {TIMING_OPTIONS.map(({ value, label, availKey }) => (
                      <option key={value} value={value} disabled={!timingAvailability[availKey]}>
                        {label}{!timingAvailability[availKey] ? ' (현재 불가)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">재주문 수량</span>
                  <input
                    aria-label={`${order.id} 재주문 수량`}
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={draft.quantity}
                    onChange={(e) => handleDraftChange(order.id, 'quantity', e.target.value)}
                    disabled={disabled || isBlocked}
                    className="h-10 rounded-[var(--r-md)] border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="font-medium">재주문 가격</span>
                  <input
                    aria-label={`${order.id} 재주문 가격`}
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={draft.price}
                    onChange={(e) => handleDraftChange(order.id, 'price', e.target.value)}
                    disabled={disabled || isBlocked}
                    className="h-10 rounded-[var(--r-md)] border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="font-medium">메모</span>
                  <input
                    aria-label={`${order.id} 메모`}
                    value={draft.memo}
                    onChange={(e) => handleDraftChange(order.id, 'memo', e.target.value)}
                    disabled={disabled || isBlocked}
                    maxLength={200}
                    className="h-10 rounded-[var(--r-md)] border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>
              </div>
            </section>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        {!isBlocked && changedOrderIds.length === 0 && orders.length > 0 && (
          <p className="text-sm text-muted-foreground">변경된 주문이 없습니다.</p>
        )}
        <button
          type="submit"
          disabled={disabled || changedOrderIds.length === 0 || isBlocked}
          className="rounded-[var(--r-md)] border border-border bg-background px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          {disabled ? '처리 중...' : `변경한 주문 ${changedOrderIds.length}건 재주문`}
        </button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>주문가능금액을 초과합니다</AlertDialogTitle>
            <AlertDialogDescription>
              {budget?.state === 'ok'
                ? `변경한 BUY 합계 $${fmtUsd(budget.required)}가 남은 주문가능금액 $${fmtUsd(budget.remaining)}를 넘습니다. 증권사에서 거절될 수 있습니다. 그래도 재주문하시겠습니까?`
                : '변경한 BUY 합계가 남은 주문가능금액을 넘습니다. 그래도 재주문하시겠습니까?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => void submitItems()}>재주문</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
