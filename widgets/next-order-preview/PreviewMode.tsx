'use client'

import { OrderRow } from './OrderRow'
import type { NextOrderPreview } from '@entities/order'

interface Props {
  preview: NextOrderPreview | null
  isLoading: boolean
  error: 'no-strategy' | 'kis-fail' | null
  showInsufficientBanner: boolean
  totalBuy: number
  purchasable: number | null
  shortfall: number
  insufficientUnitAmount: number | null
  insufficientCurrentPrice: number | null
  insufficientShortfall: number | null
  onRefetch: () => void
}

export function PreviewMode({
  preview,
  isLoading,
  error,
  showInsufficientBanner,
  totalBuy,
  purchasable,
  shortfall,
  insufficientUnitAmount,
  insufficientCurrentPrice,
  insufficientShortfall,
  onRefetch,
}: Props) {
  if (isLoading && !preview) {
    return (
      <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
        KIS에서 현재가와 잔고를 조회 중...
      </div>
    )
  }

  if (error === 'no-strategy') {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">활성 전략이 없습니다.</p>
    )
  }

  if (error === 'kis-fail') {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <p className="text-sm text-muted-foreground text-center">
          KIS API 조회에 실패했습니다. 잠시 후 다시 시도해주세요.
        </p>
        <button
          type="button"
          onClick={onRefetch}
          className="text-xs px-3 py-1.5 rounded-md border border-border hover:border-rose-300 hover:text-rose-600 transition-colors"
        >
          재시도
        </button>
      </div>
    )
  }

  if (!preview) return null

  return (
    <div className="space-y-4">
      {showInsufficientBanner && (
        <div className="rounded-lg px-4 py-2.5 bg-warn-bg">
          <p className="text-xs font-semibold text-warn leading-relaxed">
            ⚠️ 매수 예정 금액 ${totalBuy.toFixed(2)} • 예수금 ${(purchasable ?? 0).toFixed(2)} • 잔고 부족 ${shortfall.toFixed(2)}
          </p>
        </div>
      )}

      {preview.orders.length === 0 ? (
        preview.skipReason === 'INSUFFICIENT_BALANCE' && insufficientShortfall !== null ? (
          <div className="rounded-lg px-4 py-2.5 bg-warn-bg">
            <p className="text-xs font-semibold text-warn leading-relaxed">
              ⚠️ 단위금액 ${insufficientUnitAmount!.toFixed(2)} • 현재가 ${insufficientCurrentPrice!.toFixed(2)} • 부족 ${insufficientShortfall.toFixed(2)}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-3">
            {preview.skipReason === 'NO_CYCLE_HISTORY' && '첫 자동 매매 전에는 미리보기를 계산할 수 없습니다.'}
            {preview.skipReason === 'INSUFFICIENT_BALANCE' && '잔고 부족으로 이번 사이클은 건너뜁니다.'}
            {preview.skipReason === 'NO_PRIVACY_BASE' && '오늘의 기준 매매표가 아직 수신되지 않았습니다.'}
            {!preview.skipReason && '이번 사이클은 예정된 주문이 없습니다.'}
          </p>
        )
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-widest text-rose-500 font-semibold">
            예정 주문 {preview.orders.length}건
          </p>
          {preview.orders.map((order, i) => (
            <OrderRow
              key={`${order.ticker}-${order.direction}-${order.orderType}-${i}`}
              ticker={order.ticker}
              direction={order.direction}
              orderType={order.orderType}
              quantity={order.quantity}
              price={order.price}
            />
          ))}
        </div>
      )}
    </div>
  )
}
