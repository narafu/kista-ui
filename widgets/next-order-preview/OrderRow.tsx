'use client'

import { fmtUsd } from '@shared/lib/format'
import { toNum } from '@shared/lib/utils'

interface Props {
  ticker: string
  direction: string
  orderType: string
  quantity: number
  price: string
  id?: string
  onCancel?: (id: string) => void
  cancelDisabled?: boolean
  isCancellingThis?: boolean
}

export function OrderRow({
  ticker,
  direction,
  orderType,
  quantity,
  price,
  id,
  onCancel,
  cancelDisabled,
  isCancellingThis,
}: Props) {
  const isBuy = direction === 'BUY'
  const priceNum = toNum(price)
  const total = priceNum > 0 ? priceNum * quantity : null

  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
          style={{
            background: isBuy ? 'var(--pos-bg)' : 'var(--neg-bg)',
            color: isBuy ? 'var(--pos)' : 'var(--neg)',
          }}
        >
          {isBuy ? '매수' : '매도'}
        </span>
        <span className="text-xs text-muted-foreground font-medium">{orderType}</span>
        <span className="text-sm font-medium">{ticker}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-sm font-semibold">
            {quantity}주{priceNum > 0 && ` × $${fmtUsd(priceNum)}`}
          </p>
          {total != null && (
            <p className="text-xs text-muted-foreground">= ${fmtUsd(total)}</p>
          )}
        </div>
        {onCancel && id && (
          <button
            type="button"
            onClick={() => onCancel(id)}
            disabled={cancelDisabled}
            className="text-xs px-2 py-1 rounded-md border border-border text-muted-foreground hover:border-rose-300 hover:text-rose-600 transition-colors disabled:opacity-50"
          >
            {isCancellingThis ? '...' : '✕'}
          </button>
        )}
      </div>
    </div>
  )
}
