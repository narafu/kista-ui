'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { AdminOrderCorrectionRequest, AdminStrategyOrder } from '@entities/user'

type EditableOrderStatus = Extract<AdminStrategyOrder['status'], 'PLANNED' | 'PLACED' | 'FILLED' | 'PARTIALLY_FILLED'>

interface OrderDraft {
  quantity: string
  price: string
  memo: string
}

interface BatchItem {
  orderId: string
  mode: AdminOrderCorrectionRequest['mode']
  direction?: AdminOrderCorrectionRequest['direction']
  quantity?: number
  price?: number
  memo?: string
}

interface Props {
  orders: AdminStrategyOrder[]
  disabled: boolean
  onSubmit: (items: BatchItem[]) => Promise<void>
}

const FORM_CONFIG: Record<
  EditableOrderStatus,
  {
    mode: AdminOrderCorrectionRequest['mode']
    toneClassName: string
    description: string
  }
> = {
  PLANNED: {
    mode: 'PLANNED_EDIT',
    toneClassName: 'border border-border bg-muted/20 text-foreground',
    description: '제출 전 주문입니다. 수량과 가격을 직접 수정합니다.',
  },
  PLACED: {
    mode: 'PLACED_REPLACE',
    toneClassName: 'border border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-950/70 dark:bg-amber-950/20 dark:text-amber-200',
    description: '기존 주문을 취소한 뒤 같은 날 주문 세트를 다시 제출합니다.',
  },
  FILLED: {
    mode: 'FILLED_CORRECTION',
    toneClassName: 'border border-border bg-muted/20 text-foreground',
    description: '체결 결과를 기준으로 보정값을 반영합니다.',
  },
  PARTIALLY_FILLED: {
    mode: 'FILLED_CORRECTION',
    toneClassName: 'border border-border bg-muted/20 text-foreground',
    description: '일부 체결 수량을 포함해 최종 체결 결과를 보정합니다.',
  },
}

const READ_ONLY_ORDER_MESSAGE: Partial<Record<AdminStrategyOrder['status'], string>> = {
  FAILED: '읽기 전용',
  CANCELLED: '읽기 전용',
}

function getOrderConfig(order: AdminStrategyOrder) {
  return FORM_CONFIG[order.status as EditableOrderStatus] ?? null
}

function buildInitialDrafts(orders: AdminStrategyOrder[]) {
  return Object.fromEntries(
    orders.map((order) => [
      order.id,
      {
        quantity: String(order.quantity),
        price: String(order.price),
        memo: '',
      } satisfies OrderDraft,
    ]),
  ) as Record<string, OrderDraft>
}

export function AdminBatchOrderCorrectionForm({ orders, disabled, onSubmit }: Props) {
  const [drafts, setDrafts] = useState<Record<string, OrderDraft>>(() => buildInitialDrafts(orders))

  useEffect(() => {
    setDrafts(buildInitialDrafts(orders))
  }, [orders])

  const editableOrders = useMemo(
    () => orders.filter((order) => getOrderConfig(order)),
    [orders],
  )
  const readOnlyOrders = useMemo(
    () => orders.filter((order) => !getOrderConfig(order)),
    [orders],
  )

  const handleDraftChange = (orderId: string, key: keyof OrderDraft, value: string) => {
    setDrafts((current) => ({
      ...current,
      [orderId]: {
        ...(current[orderId] ?? { quantity: '', price: '', memo: '' }),
        [key]: value,
      },
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const items: BatchItem[] = editableOrders.map((order) => {
      const config = getOrderConfig(order)!
      const draft = drafts[order.id] ?? {
        quantity: String(order.quantity),
        price: String(order.price),
        memo: '',
      }

      return {
        orderId: order.id,
        mode: config.mode,
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
          <h3 className="text-sm font-semibold">거래일 주문 일괄 보정</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            조회된 주문 {orders.length}건을 같은 요청 흐름에서 순차 보정합니다.
          </p>
        </div>
        <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          수정 가능 {editableOrders.length}건 · 읽기 전용 {readOnlyOrders.length}건
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {orders.map((order) => {
          const config = getOrderConfig(order)
          const draft = drafts[order.id] ?? { quantity: String(order.quantity), price: String(order.price), memo: '' }
          const isReadOnly = !config

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

              <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${config?.toneClassName ?? 'border border-border bg-muted/20 text-muted-foreground'}`}>
                <p className="font-medium">
                  {config ? `보정 모드: ${config.mode}` : `${READ_ONLY_ORDER_MESSAGE[order.status] ?? '보정 불가'} 주문`}
                </p>
                <p className="mt-1">
                  {config?.description ?? '취소/실패 상태 주문은 현재 일괄 보정 대상에서 제외됩니다.'}
                </p>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <label className="grid gap-2 text-sm">
                  <span className="font-medium">보정 수량</span>
                  <input
                    aria-label={`${order.id} 보정 수량`}
                    type="number"
                    min="0"
                    step="1"
                    value={draft.quantity}
                    onChange={(event) => handleDraftChange(order.id, 'quantity', event.target.value)}
                    disabled={disabled || isReadOnly}
                    className="h-10 rounded-lg border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="font-medium">보정 가격</span>
                  <input
                    aria-label={`${order.id} 보정 가격`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.price}
                    onChange={(event) => handleDraftChange(order.id, 'price', event.target.value)}
                    disabled={disabled || isReadOnly}
                    className="h-10 rounded-lg border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </label>

                <label className="grid gap-2 text-sm">
                  <span className="font-medium">보정 메모</span>
                  <input
                    aria-label={`${order.id} 보정 메모`}
                    value={draft.memo}
                    onChange={(event) => handleDraftChange(order.id, 'memo', event.target.value)}
                    disabled={disabled || isReadOnly}
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
          disabled={disabled || editableOrders.length === 0}
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          {disabled ? '처리 중...' : `거래일 주문 ${editableOrders.length}건 일괄 보정`}
        </button>
      </div>
    </form>
  )
}
