'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useNextOrderPreview } from './useNextOrderPreview'
import { ExecuteDialog } from './ExecuteDialog'
import { PreviewMode } from './PreviewMode'
import { ExecutedMode } from './ExecutedMode'
import { toNum } from '@shared/lib/utils'

interface Props {
  accountId: string
  strategyType?: string
  strategyId?: string
}

export function NextOrderPreviewCard({ accountId, strategyType, strategyId }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const {
    preview,
    margin,
    isLoading,
    isFetching,
    error,
    lastUpdatedAt,
    refetch,
    isBlocked,
    isHoliday,
    mode,
    setMode,
    placedOrders,
    executeMutation,
    cancelAllMutation,
    cancelOneMutation,
  } = useNextOrderPreview(accountId, strategyId)

  if (!strategyType) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">다음 주문 미리보기</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">
            활성 전략을 등록하면 다음 주문을 미리 확인할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    )
  }

  const insufficientUnitAmount =
    preview?.skipReason === 'INSUFFICIENT_BALANCE' && preview?.position != null
      ? toNum(preview.position.unitAmount)
      : null

  const totalBuy =
    preview?.orders
      .filter((o) => o.direction === 'BUY')
      .reduce((sum, o) => {
        const price = toNum(o.price)
        return price > 0 && o.quantity > 0 ? sum + price * o.quantity : sum
      }, 0) ?? 0

  const usdMargin = margin?.find((m) => m.currency === 'USD') ?? null
  const purchasable = usdMargin?.purchasableAmount ?? null
  const showInsufficientBanner = totalBuy > 0 && purchasable !== null && totalBuy > purchasable
  const shortfall = showInsufficientBanner ? totalBuy - (purchasable ?? 0) : 0

  const isRunning = executeMutation.isPending
  const isCancelling = cancelAllMutation.isPending
  const cancellingOrderId = cancelOneMutation.isPending ? cancelOneMutation.variables : null

  return (
    <>
      <ExecuteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        isRunning={isRunning}
        onConfirm={() => executeMutation.mutate(undefined, { onSettled: () => setDialogOpen(false) })}
      />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">다음 주문 미리보기</CardTitle>
              {lastUpdatedAt && (
                <p className="text-xs text-muted-foreground mt-0.5">방금 갱신 · {lastUpdatedAt}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {strategyId && mode === 'preview' && (
                <div className="relative group inline-flex">
                  <button
                    type="button"
                    onClick={() => {
                      if (isHoliday) { toast.info('오늘은 미국 증시 휴장일입니다'); return }
                      if (isBlocked) { toast.info('주문 불가 시간대입니다 (프리마켓/정규장 시간에만 가능)'); return }
                      setDialogOpen(true)
                    }}
                    disabled={isFetching || isRunning}
                    className={`text-xs px-3 py-1.5 rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-50${isBlocked || isHoliday ? ' opacity-50 cursor-not-allowed' : ''}`}
                  >
                    지금 실행
                  </button>
                  {(isBlocked || isHoliday) && (
                    <div className="absolute top-full right-0 mt-2 px-2.5 py-1.5 bg-foreground text-background text-xs rounded-md shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      {isHoliday ? '오늘은 미국 증시 휴장일입니다' : '주문 불가 시간대입니다 (프리마켓/정규장 시간에만 가능)'}
                    </div>
                  )}
                </div>
              )}
              {mode === 'preview' && (
                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:border-rose-300 hover:text-rose-600 transition-colors disabled:opacity-50"
                >
                  {isFetching ? '조회 중...' : '새로고침'}
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {mode === 'executed' ? (
            <ExecutedMode
              placedOrders={placedOrders}
              isCancelling={isCancelling}
              cancellingOrderId={cancellingOrderId ?? null}
              onCancelAll={() => cancelAllMutation.mutate()}
              onCancelOne={(id) => cancelOneMutation.mutate(id)}
              onBackToPreview={() => { setMode('preview'); refetch() }}
            />
          ) : (
            <PreviewMode
              preview={preview}
              isLoading={isLoading}
              error={error}
              showInsufficientBanner={showInsufficientBanner}
              totalBuy={totalBuy}
              purchasable={purchasable}
              shortfall={shortfall}
              insufficientUnitAmount={insufficientUnitAmount}
              onRefetch={refetch}
            />
          )}
        </CardContent>
      </Card>
    </>
  )
}
