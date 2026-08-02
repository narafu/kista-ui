'use client'

import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCancelAllOrdersMutation, useCancelOneOrderMutation } from '@entities/order'
import { cn } from '@shared/lib/utils'
import { EmptyState } from '@shared/ui/EmptyState'
import { BRAND_GRADIENT_BUTTON_CLASS } from '@shared/ui/brand-button-class'
import type { Strategy } from '@entities/strategy'
import type { NextOrderPreview, OrderReadiness } from '@entities/order'
import { SKIP_REASON_LABELS, BUY_COPY, SELL_COPY, directionUnplacedMessage, previewErrorMsg } from './orderBannerCopy'
import { OrderRows } from './OrderRows'

interface Props {
  strategy: Strategy
  preview: NextOrderPreview | undefined
  isLoadingPreview: boolean
  isPreviewError: boolean
  previewError: unknown
  readiness: OrderReadiness
  mode: 'preview' | 'executed'
  canExecute: boolean
  bannerText: string | null
  marketStatusMessage: string | null
  isConfirmedHoliday: boolean
  execute: () => void
  isExecuting: boolean
}

export function NextOrderCard({
  strategy,
  preview,
  isLoadingPreview,
  isPreviewError,
  previewError,
  readiness,
  mode,
  canExecute,
  bannerText,
  marketStatusMessage,
  isConfirmedHoliday,
  execute,
  isExecuting,
}: Props) {
  const placedOrders = preview?.todayOrders ?? []
  const orders = preview?.orders ?? []

  // executed 모드에서만 의미 있음: preview 모드는 "아직 시도 안 함"과 "전량 거절"을 구분할 수 없다
  const unplacedDirections: Array<'BUY' | 'SELL'> = mode === 'executed'
    ? [...(readiness.buy.unplaced ? (['BUY'] as const) : []), ...(readiness.sell.unplaced ? (['SELL'] as const) : [])]
    : []

  const cancelAllMutation = useCancelAllOrdersMutation(strategy.id)
  const cancelOneMutation = useCancelOneOrderMutation(strategy.id)

  function handleCancelOne(id: string) {
    cancelOneMutation.mutate(id)
  }

  return (
    <div className="space-y-2">
      {bannerText && (
        <div className="flex items-center gap-2 rounded-[var(--r-md)] bg-warn-bg px-3.5 py-2.5 text-sm lg:text-base font-semibold text-warn">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{bannerText}</span>
        </div>
      )}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base lg:text-lg">다음 주문</CardTitle>
              <p className="text-sm lg:text-base text-muted-foreground mt-0.5">매 거래일 개장 시 자동실행</p>
              {unplacedDirections.length > 0 && (
                <div className="flex flex-col gap-0.5 mt-1.5">
                  {unplacedDirections.map((d) => (
                    <p key={d} className="text-sm lg:text-base text-warn">
                      {d === 'BUY' ? directionUnplacedMessage(readiness.buy, BUY_COPY) : directionUnplacedMessage(readiness.sell, SELL_COPY)}
                    </p>
                  ))}
                </div>
              )}
            </div>
            {canExecute && mode === 'preview' && (
              <button
                type="button"
                onClick={() => {
                  if (marketStatusMessage) {
                    toast.info(marketStatusMessage)
                    return
                  }
                  if (isConfirmedHoliday) {
                    toast.info('오늘은 미국 증시 휴장일입니다')
                    return
                  }
                  // BUY/SELL 부족·확인 실패가 동시에 있을 수 있어 둘 다 확인해 각각 토스트로 안내한다 —
                  // 한쪽만 안내하면 사용자가 나머지 사유를 모른 채 재시도하게 된다
                  const blockers = [
                    readiness.buy.uncertain && '예수금 확인에 실패했습니다 — 잠시 후 다시 확인해주세요',
                    readiness.sell.uncertain && '판매가능수량 확인에 실패했습니다 — 잠시 후 다시 확인해주세요',
                    !readiness.buy.uncertain && readiness.buy.hasDeficit && '예수금이 부족합니다',
                    !readiness.sell.uncertain && readiness.sell.hasDeficit && '판매가능수량이 부족합니다',
                  ].filter((msg): msg is string => Boolean(msg))
                  if (blockers.length > 0) {
                    blockers.forEach((message) => toast.info(message))
                    return
                  }
                  execute()
                }}
                disabled={isExecuting || orders.length === 0}
                className={cn(
                  'inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md whitespace-nowrap shrink-0',
                  BRAND_GRADIENT_BUTTON_CLASS,
                )}
              >
                {isExecuting ? '주문 중...' : '바로 주문'}
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {mode === 'executed' ? (
            <div>
              <div className="flex items-center justify-between px-6 py-3 border-b border-border">
                <p className="text-sm lg:text-base uppercase tracking-widest font-semibold text-warn">{placedOrders.length > 0 ? `${placedOrders.length}건 접수됨` : '접수됨'}</p>
                <button
                  type="button"
                  onClick={() =>
                    cancelAllMutation.mutate(undefined, {
                      onSuccess: (r) => {
                        if (r.failedCount === 0) {
                          toast.success(`${r.cancelledCount}건 모두 취소됐습니다.`)
                        } else {
                          toast.warning(`${r.cancelledCount}건 취소, ${r.failedCount}건 실패 — KIS에서 직접 확인하세요.`)
                        }
                      },
                    })
                  }
                  disabled={cancelAllMutation.isPending}
                  className="text-sm lg:text-base px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-50"
                >
                  {cancelAllMutation.isPending ? '취소 중...' : '전체 취소'}
                </button>
              </div>
              <OrderRows
                orders={placedOrders}
                onCancelOne={handleCancelOne}
                cancellingId={cancelOneMutation.isPending ? cancelOneMutation.variables : null}
                cancelPending={cancelOneMutation.isPending}
              />
            </div>
          ) : isLoadingPreview ? (
            <p className="text-sm lg:text-base text-muted-foreground text-center px-6 py-4">불러오는 중…</p>
          ) : isPreviewError ? (
            <p className="text-sm lg:text-base text-muted-foreground text-center px-6 py-4">{previewErrorMsg(previewError)}</p>
          ) : orders.length === 0 ? (
            <EmptyState variant="text" message={preview?.skipReason ? SKIP_REASON_LABELS[preview.skipReason] : '예정된 주문이 없습니다.'} />
          ) : (
            <OrderRows orders={orders} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
