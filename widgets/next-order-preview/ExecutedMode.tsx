'use client'

import { OrderRow } from './OrderRow'
import type { PlacedOrder } from '@entities/order'

interface Props {
  placedOrders: PlacedOrder[]
  isCancelling: boolean
  cancellingOrderId: string | null
  onCancelAll: () => void
  onCancelOne: (id: string) => void
  onBackToPreview: () => void
}

export function ExecutedMode({
  placedOrders,
  isCancelling,
  cancellingOrderId,
  onCancelAll,
  onCancelOne,
  onBackToPreview,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--warn)' }}>
            ✓ {placedOrders.length > 0 ? `${placedOrders.length}건 접수됨` : '접수됨'}
          </p>
          <button
            type="button"
            onClick={onCancelAll}
            disabled={isCancelling || cancellingOrderId !== null}
            className="text-xs px-2.5 py-1 rounded-md bg-warn-bg text-warn hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            {isCancelling ? '취소 중...' : '전체 취소'}
          </button>
        </div>
        {placedOrders.length > 0 ? (
          <div className="divide-y divide-border">
            {placedOrders.map((order) => (
              <OrderRow
                key={order.id}
                ticker={order.ticker}
                direction={order.direction}
                orderType={order.orderType}
                quantity={order.quantity}
                price={order.price}
                id={order.id}
                onCancel={onCancelOne}
                cancelDisabled={isCancelling || cancellingOrderId !== null}
                isCancellingThis={cancellingOrderId === order.id}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            접수된 주문 목록은 백엔드 업데이트 후 표시됩니다.
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onBackToPreview}
        className="w-full text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:border-rose-300 hover:text-rose-600 transition-colors"
      >
        ↩ 다시 미리보기
      </button>
    </div>
  )
}
