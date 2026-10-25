'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@shared/ui/Badge'
import { directionTextClass } from '@entities/trade'
import { useMeta } from '@entities/meta'
import { useAdminReorderBuyBudgetQuery } from '@entities/admin'
import type { AdminReorderBuyBudget, AdminReorderTimingAvailability, AdminStrategyOrder, OrderTiming } from '@entities/admin'
import { orderStatusBadgeClass } from '@entities/order'
import type { OrderDirection } from '@shared/lib/api-schema'
import { fmtUsd, nextTradeDateKst } from '@shared/lib/format'
import { toSelectValue } from '@shared/lib/utils'

export interface ReorderBatchItem {
  orderId: string
  timing: OrderTiming
  direction: OrderDirection
  quantity: number
  price: number
  memo?: string
}

interface OrderDraft {
  timing: OrderTiming
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
  value: OrderTiming
  label: string
  availKey: keyof AdminReorderTimingAvailability
}[] = [
  { value: 'AT_OPEN',   label: '개장 접수',  availKey: 'atOpen' },
  { value: 'AT_CLOSE',  label: '마감 접수', availKey: 'atClose' },
  { value: 'IMMEDIATE', label: '즉시 접수',             availKey: 'immediate' },
]

function getDefaultTiming(avail: AdminReorderTimingAvailability): OrderTiming {
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

type BuyBudgetSummary =
  | { state: 'loading' }
  | { state: 'unknown' }
  | { state: 'uncapped' }
  | { state: 'ok'; remaining: number; required: number; excess: number }

// 사이클별 가용 = cycleRemaining[사이클] + Σ 그 사이클에서 재주문할 BUY 원본의 sourceRefunds.
// 재주문하지 않는 행은 원본이 취소되지 않으므로 refund를 더하지 않는다. 서버는 사이클 단위로 409 차단하므로
// 초과도 사이클마다 판정한다. 변경한 BUY가 없는 사이클은 원장이 이미 음수여도 이번 재주문과 무관하므로 판정·표시에서 뺀다.
// 표시는 변경한 사이클(없으면 상한 있는 전체) 합계다 — 폼은 한 전략 소속이라 보통 사이클 1개.
// cycleRemaining 자체가 없으면(구 API) 확인 불가, 키만 없으면 DCA 사이클이라 상한 없음
function summarizeBuyBudget(
  query: { data?: AdminReorderBuyBudget; isPending: boolean; isError: boolean },
  buyOrders: AdminStrategyOrder[],
  targets: Map<string, number>, // 재주문할 BUY 원본 id → 변경한 금액
): BuyBudgetSummary {
  if (query.isError) return { state: 'unknown' }
  if (query.isPending) return { state: 'loading' }
  const budget = query.data
  if (budget?.cycleRemaining == null || budget.sourceRefunds == null) return { state: 'unknown' }
  if (buyOrders.some((order) => order.strategyCycleId == null)) return { state: 'unknown' }
  const cycles = new Map<string, { remaining: number; required: number; changed: boolean }>()
  for (const order of buyOrders) {
    const limit = budget.cycleRemaining[order.strategyCycleId!]
    if (limit == null) continue
    const cycle = cycles.get(order.strategyCycleId!) ?? { remaining: limit, required: 0, changed: false }
    const amount = targets.get(order.id)
    if (amount != null) {
      cycle.remaining += budget.sourceRefunds[order.id] ?? 0
      cycle.required += amount
      cycle.changed = true
    }
    cycles.set(order.strategyCycleId!, cycle)
  }
  if (cycles.size === 0) return { state: 'uncapped' }
  const changed = [...cycles.values()].filter((c) => c.changed)
  const shown = changed.length > 0 ? changed : [...cycles.values()]
  const excess = changed.reduce((sum, c) => sum + Math.max(0, c.required - c.remaining), 0)
  return {
    state: 'ok',
    remaining: shown.reduce((sum, c) => sum + c.remaining, 0),
    required: shown.reduce((sum, c) => sum + c.required, 0),
    excess: excess > 0.005 ? excess : 0,
  }
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
  const { labelOf } = useMeta()
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

  // 재주문 POST와 같은 거래일(nextTradeDateKst) 기준 — 날짜가 바뀌면 queryKey가 달라져 재조회된다
  const buyOrders = orders.filter((order) => order.direction === 'BUY')
  const budgetQuery = useAdminReorderBuyBudgetQuery(buyOrders.map((order) => order.id), nextTradeDateKst())
  const budget = buyOrders.length === 0 ? null : summarizeBuyBudget(
    budgetQuery,
    buyOrders,
    new Map(buyOrders.flatMap((order) => {
      if (!changedSet.has(order.id)) return []
      const draft = drafts[order.id]
      return [[order.id, Number(draft?.price) * Number(draft?.quantity) || 0] as const]
    })),
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

  // 원장 한도 초과는 서버가 409로 차단하므로 제출 버튼을 막는다
  const isOverBudget = budget?.state === 'ok' && budget.excess > 0
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isOverBudget) return
    await submitItems()
  }

  if (orders.length === 0) return null

  const timingItems = TIMING_OPTIONS.map(({ value, label, availKey }) => ({ value, label: `${label}${!timingAvailability[availKey] ? ' (현재 불가)' : ''}` }))

  return (
    <form className="mt-4 rounded-[var(--r-lg)] border border-border bg-muted/10 p-4" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">거래일 주문 일괄 재주문</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            조회된 주문 {orders.length}건 중 값을 바꾼 주문만 순차 재주문합니다.
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
            <p className="text-muted-foreground">남은 원장 한도 조회 중...</p>
          )}
          {budget.state === 'unknown' && (
            <p className="rounded-[var(--r-md)] border border-dashed border-warn bg-warn-bg px-3 py-2 text-warn">
              원장 한도 조회 실패 — 예산 확인 불가
            </p>
          )}
          {budget.state === 'ok' && (
            <>
              <p className="text-muted-foreground">
                남은 원장 한도 <span className="font-semibold text-foreground">${fmtUsd(budget.remaining)}</span>
                {hasChangedBuy && <> · 변경한 매수 합계 <span className="font-semibold text-foreground">${fmtUsd(budget.required)}</span></>}
              </p>
              {budget.excess > 0 && (
                <p className="rounded-[var(--r-md)] border border-dashed border-warn bg-warn-bg px-3 py-2 text-warn">
                  변경한 매수 주문 합계가 남은 원장 한도를 ${fmtUsd(budget.excess)} 초과합니다. 전략 원장 예수금이 부족해 재주문할 수 없습니다.
                </p>
              )}
            </>
          )}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {orders.map((order, index) => {
          const draft = drafts[order.id] ?? {
            timing: getDefaultTiming(timingAvailability),
            quantity: String(order.quantity),
            price: String(order.price),
            memo: '',
          }

          const isChanged = changedSet.has(order.id)
          // 체결·취소·실패한 주문은 재주문 불가 — 서버도 미체결(PLANNED·PLACED) 원본만 받는다. 체결분 보정은 수동 체결 보정
          const isClosed = order.status !== 'PLANNED' && order.status !== 'PLACED'
          return (
            <section key={order.id} className={`rounded-[var(--r-md)] border bg-background p-3 ${isChanged ? 'border-primary' : 'border-border'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium"><span className={directionTextClass(order.direction)}>{labelOf('orderDirections', order.direction)}</span> · {labelOf('orderTypes', order.orderType)}</span>
                <span className="text-muted-foreground">· {order.quantity}주</span>
                <span className="text-muted-foreground">· {order.ticker}</span>
                {isChanged && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    변경됨
                  </span>
                )}
                <Badge tone="none" className={`ml-auto ${orderStatusBadgeClass(order.status)}`}>
                  {labelOf('orderStatuses', order.status)}
                </Badge>
              </div>
              {isClosed && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {/* 서버(ReorderService)도 SUBMITTING을 거부 — 결과 불명 주문은 런북으로 PLACED/FAILED 정정 후 재주문 */}
                  {order.status === 'SUBMITTING' ? '접수 결과가 확정되지 않은 주문은 재주문할 수 없습니다.' : '미체결 주문만 재주문할 수 있습니다.'}
                </p>
              )}

              <div className="mt-3">
                <div className="grid gap-2 text-sm">
                  <Label htmlFor={`reorder-timing-${order.id}`} className="font-medium">주문시점</Label>
                  <Select
                    items={timingItems}
                    value={toSelectValue(timingItems, draft.timing)}
                    onValueChange={(value) => { if (value) handleDraftChange(order.id, 'timing', value) }}
                    disabled={disabled || isBlocked || isClosed}
                  >
                    <SelectTrigger id={`reorder-timing-${order.id}`} aria-label={`주문 ${index + 1} 주문시점`} className="h-10 w-full">
                      <SelectValue placeholder="주문시점 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMING_OPTIONS.map(({ value, label, availKey }) => (
                        <SelectItem key={value} value={value} disabled={!timingAvailability[availKey]}>
                          {label}{!timingAvailability[availKey] ? ' (현재 불가)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="grid gap-2 text-sm">
                  <Label htmlFor={`reorder-quantity-${order.id}`} className="font-medium">재주문 수량</Label>
                  <Input
                    id={`reorder-quantity-${order.id}`}
                    aria-label={`주문 ${index + 1} 재주문 수량`}
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={draft.quantity}
                    onChange={(e) => handleDraftChange(order.id, 'quantity', e.target.value)}
                    disabled={disabled || isBlocked || isClosed}
                    className="h-10"
                  />
                </div>

                <div className="grid gap-2 text-sm">
                  <Label htmlFor={`reorder-price-${order.id}`} className="font-medium">재주문 가격</Label>
                  <Input
                    id={`reorder-price-${order.id}`}
                    aria-label={`주문 ${index + 1} 재주문 가격`}
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={draft.price}
                    onChange={(e) => handleDraftChange(order.id, 'price', e.target.value)}
                    disabled={disabled || isBlocked || isClosed}
                    className="h-10"
                  />
                </div>

                <div className="grid gap-2 text-sm">
                  <Label htmlFor={`reorder-memo-${order.id}`} className="font-medium">메모</Label>
                  <Input
                    id={`reorder-memo-${order.id}`}
                    aria-label={`주문 ${index + 1} 메모`}
                    value={draft.memo}
                    onChange={(e) => handleDraftChange(order.id, 'memo', e.target.value)}
                    disabled={disabled || isBlocked || isClosed}
                    maxLength={200}
                    className="h-10"
                  />
                </div>
              </div>
            </section>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        {!isBlocked && changedOrderIds.length === 0 && orders.length > 0 && (
          <p className="text-sm text-muted-foreground">변경된 주문이 없습니다.</p>
        )}
        <Button type="submit" variant="brand" disabled={disabled || changedOrderIds.length === 0 || isBlocked || isOverBudget}>
          {disabled ? '처리 중...' : `변경한 주문 ${changedOrderIds.length}건 재주문`}
        </Button>
      </div>

    </form>
  )
}
