'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { AdminReorderTimingAvailability, AdminStrategyOrder } from '@entities/user'
import type { OrderDirection } from '@shared/lib/api-schema'

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

export function AdminBatchOrderCorrectionForm({ orders, disabled, timingAvailability, onSubmit }: Props) {
  const [drafts, setDrafts] = useState<Record<string, OrderDraft>>(() =>
    buildInitialDrafts(orders, timingAvailability),
  )

  useEffect(() => {
    setDrafts(buildInitialDrafts(orders, timingAvailability))
  }, [orders, timingAvailability])

  const isBlocked = useMemo(
    () => !timingAvailability.atOpen && !timingAvailability.atClose && !timingAvailability.immediate,
    [timingAvailability],
  )

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const items: ReorderBatchItem[] = orders.map((order) => {
      const draft = drafts[order.id] ?? {
        timing: getDefaultTiming(timingAvailability),
        quantity: String(order.quantity),
        price: String(order.price),
        memo: '',
      }
      return {
        orderId: order.id,
        timing: draft.timing,
        direction: order.direction,
        quantity: Number(draft.quantity),
        price: Number(draft.price),
        memo: draft.memo.trim() || undefined,
      }
    })

    await onSubmit(items)
  }

  if (orders.length === 0) return null

  return (
    <form className="mt-4 rounded-xl border border-border bg-muted/10 p-4" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">거래일 주문 일괄 재주문</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            조회된 주문 {orders.length}건을 같은 요청 흐름에서 순차 재주문합니다.
          </p>
        </div>
        {isBlocked && (
          <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
            현재 시장 단계(장마감~프리마켓 전)에서는 접수 가능한 주문시점이 없습니다.
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {orders.map((order) => {
          const draft = drafts[order.id] ?? {
            timing: getDefaultTiming(timingAvailability),
            quantity: String(order.quantity),
            price: String(order.price),
            memo: '',
          }

          return (
            <section key={order.id} className="rounded-lg border border-border bg-background p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{order.direction} · {order.orderType}</span>
                <span className="text-muted-foreground">· {order.quantity}주</span>
                <span className="text-muted-foreground">· {order.ticker}</span>
                <span className="ml-auto inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {order.status}
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
                    className="h-10 rounded-lg border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="h-10 rounded-lg border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="h-10 rounded-lg border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="font-medium">메모</span>
                  <input
                    aria-label={`${order.id} 메모`}
                    value={draft.memo}
                    onChange={(e) => handleDraftChange(order.id, 'memo', e.target.value)}
                    disabled={disabled || isBlocked}
                    className="h-10 rounded-lg border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>
              </div>
            </section>
          )
        })}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={disabled || orders.length === 0 || isBlocked}
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          {disabled ? '처리 중...' : `거래일 주문 ${orders.length}건 일괄 재주문`}
        </button>
      </div>
    </form>
  )
}
