'use client'

import { useState, type FormEvent } from 'react'
import type { AdminOrderCorrectionRequest, AdminStrategyOrder } from '@entities/user'

interface Props {
  order: AdminStrategyOrder
  disabled: boolean
  onSubmit: (request: Pick<AdminOrderCorrectionRequest, 'mode' | 'direction' | 'quantity' | 'price' | 'memo'>) => Promise<void>
}

const FORM_CONFIG: Record<
  Extract<AdminStrategyOrder['status'], 'PLANNED' | 'PLACED' | 'FILLED' | 'PARTIALLY_FILLED'>,
  {
    mode: AdminOrderCorrectionRequest['mode']
    ctaLabel: string
    toneClassName: string
    description: string
  }
> = {
  PLANNED: {
    mode: 'PLANNED_EDIT',
    ctaLabel: '계획 주문 수정',
    toneClassName: 'border border-border bg-muted/20 text-foreground',
    description: 'PLANNED 주문은 아직 제출 전 상태입니다. 수량과 가격을 바로 수정할 수 있습니다.',
  },
  PLACED: {
    mode: 'PLACED_REPLACE',
    ctaLabel: '취소 후 재주문',
    toneClassName: 'border border-amber-300 bg-amber-50 text-amber-950',
    description: 'PLACED 주문은 기존 주문을 취소한 뒤 다시 주문합니다. 체결 위험을 확인한 뒤 진행하세요.',
  },
  FILLED: {
    mode: 'FILLED_CORRECTION',
    ctaLabel: '체결 내역 보정',
    toneClassName: 'border border-border bg-muted/20 text-foreground',
    description: 'FILLED 주문은 체결 결과를 기준으로 보정합니다. 보정값을 다시 확인하세요.',
  },
  PARTIALLY_FILLED: {
    mode: 'FILLED_CORRECTION',
    ctaLabel: '체결 내역 보정',
    toneClassName: 'border border-border bg-muted/20 text-foreground',
    description: 'PARTIALLY_FILLED 주문은 일부 체결 수량을 포함해 최종 체결 상태를 보정합니다.',
  },
}

export function AdminOrderCorrectionForm({ order, disabled, onSubmit }: Props) {
  const config = FORM_CONFIG[order.status as keyof typeof FORM_CONFIG]
  const [quantity, setQuantity] = useState(String(order.quantity))
  const [price, setPrice] = useState(String(order.price))
  const [memo, setMemo] = useState('')

  if (!config) return null

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    await onSubmit({
      mode: config.mode,
      direction: order.direction,
      quantity: Number(quantity),
      price: Number(price),
      memo: memo.trim() || undefined,
    })
  }

  return (
    <form className="mt-4 rounded-xl border border-border bg-muted/10 p-4" onSubmit={handleSubmit}>
      <div className={`rounded-lg px-3 py-2 text-sm ${config.toneClassName}`}>
        <p className="font-medium">보정 모드: {config.mode}</p>
        <p className="mt-1">{config.description}</p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="grid gap-2 text-sm">
          <span className="font-medium">보정 수량</span>
          <input
            aria-label="보정 수량"
            type="number"
            min="0"
            step="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            disabled={disabled}
            className="h-10 rounded-lg border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium">보정 가격</span>
          <input
            aria-label="보정 가격"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            disabled={disabled}
            className="h-10 rounded-lg border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="font-medium">보정 메모</span>
          <input
            aria-label="보정 메모"
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            disabled={disabled}
            className="h-10 rounded-lg border border-border bg-background px-3 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={disabled}
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          {config.ctaLabel}
        </button>
      </div>
    </form>
  )
}
