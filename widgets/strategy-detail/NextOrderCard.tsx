'use client'

import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCancelAllOrdersMutation, useCancelOneOrderMutation } from '@entities/order'
import { cn } from '@shared/lib/utils'
import { EmptyState } from '@shared/ui/EmptyState'
import { buttonVariants } from '@/components/ui/button-variants'
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

// 반환된 메시지가 있으면 실행하지 않고 토스트로만 안내한다
function executeBlockMessages(
  mode: 'preview' | 'executed',
  marketStatusMessage: string | null,
  isConfirmedHoliday: boolean,
  readiness: OrderReadiness,
): string[] {
  // executed 모드는 오늘자 주문(PLANNED/PLACED)이 이미 있는 상태 — 백엔드 수동 실행 가드가
  // 전략 단위(방향 무관)로 걸려 있어 눌러도 항상 거부된다. 버튼을 숨기지 않고 이유만 안내한다
  if (mode === 'executed') return ['이미 접수된 주문이 있어 실행할 수 없습니다']
  if (marketStatusMessage) return [marketStatusMessage]
  if (isConfirmedHoliday) return ['오늘은 미국 증시 휴장일입니다']
  // BUY/SELL 부족·확인 실패가 동시에 있을 수 있어 둘 다 확인해 각각 토스트로 안내한다 —
  // 한쪽만 안내하면 사용자가 나머지 사유를 모른 채 재시도하게 된다
  return [
    readiness.buy.uncertain && '예수금 확인에 실패했습니다. 잠시 후 다시 확인해주세요.',
    readiness.sell.uncertain && '판매가능수량 확인에 실패했습니다. 잠시 후 다시 확인해주세요.',
    !readiness.buy.uncertain && readiness.buy.hasDeficit && '예수금이 부족합니다',
    !readiness.sell.uncertain && readiness.sell.hasDeficit && '판매가능수량이 부족합니다',
  ].filter((msg): msg is string => Boolean(msg))
}

// executed 모드에서만 의미 있음: preview 모드는 "아직 시도 안 함"과 "전량 거절"을 구분할 수 없다
function getUnplacedDirections(mode: 'preview' | 'executed', readiness: OrderReadiness): Array<'BUY' | 'SELL'> {
  if (mode !== 'executed') return []
  return [...(readiness.buy.unplaced ? (['BUY'] as const) : []), ...(readiness.sell.unplaced ? (['SELL'] as const) : [])]
}

interface ExecutedBodyProps {
  placedOrders: NextOrderPreview['todayOrders']
  orders: NextOrderPreview['orders']
  unplacedDirections: Array<'BUY' | 'SELL'>
  readiness: OrderReadiness
  onCancelAll: () => void
  cancelAllPending: boolean
  onCancelOne: (id: string) => void
  cancellingId: string | null | undefined
  cancelPending: boolean
}

function ExecutedBody({ placedOrders, orders, unplacedDirections, readiness, onCancelAll, cancelAllPending, onCancelOne, cancellingId, cancelPending }: ExecutedBodyProps) {
  return (
    <div>
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <p className="text-base uppercase tracking-widest font-semibold text-warn">{placedOrders.length > 0 ? `${placedOrders.length}건 접수됨` : '접수됨'}</p>
        <button
          type="button"
          onClick={onCancelAll}
          disabled={cancelAllPending}
          className="text-base px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-50"
        >
          {cancelAllPending ? '취소 중...' : '전체 취소'}
        </button>
      </div>
      <OrderRows
        orders={placedOrders}
        onCancelOne={onCancelOne}
        cancellingId={cancellingId}
        cancelPending={cancelPending}
      />
      {unplacedDirections.length > 0 && (
        <div className="border-t border-border">
          <div className="flex flex-col gap-0.5 px-6 py-3 border-b border-border">
            {unplacedDirections.map((d) => (
              <p key={d} className="whitespace-pre-line text-base text-warn">
                {d === 'BUY' ? directionUnplacedMessage(readiness.buy, BUY_COPY) : directionUnplacedMessage(readiness.sell, SELL_COPY)}
              </p>
            ))}
          </div>
          <OrderRows orders={orders.filter((o) => unplacedDirections.some((d) => d === o.direction))} />
        </div>
      )}
    </div>
  )
}

interface PreviewBodyProps {
  preview: NextOrderPreview | undefined
  orders: NextOrderPreview['orders']
  isLoadingPreview: boolean
  isPreviewError: boolean
  previewError: unknown
  canExecute: boolean
}

function PreviewBody({ preview, orders, isLoadingPreview, isPreviewError, previewError, canExecute }: PreviewBodyProps) {
  if (isLoadingPreview) return <p className="text-base text-muted-foreground text-center px-6 py-4">불러오는 중…</p>
  if (isPreviewError) return <p className="text-base text-muted-foreground text-center px-6 py-4">{previewErrorMsg(previewError)}</p>
  // 미리보기는 전략 상태·휴장 무관 강제 계산이라(kista-api: preview() "휴장·상태 무관 강제 계산"),
  // 일시정지 중에도 값이 나온다 — 그대로 노출하면 오늘 배치에서 실행될 주문처럼 오해할 수 있어 숨긴다
  if (!canExecute) return <EmptyState variant="text" message={'일시정지 중입니다\n재개하면 이 계획대로 매매가 진행됩니다'} />
  if (orders.length === 0) return <EmptyState variant="text" message={preview?.skipReason ? SKIP_REASON_LABELS[preview.skipReason] : '예정된 주문이 없습니다.'} />
  return <OrderRows orders={orders} />
}

// eslint-disable-next-line react-doctor/no-many-boolean-props -- 상태별 플래그를 부모(StrategyDetail)가 계산해 내려주는 표시 전용 카드, props 리팩토링은 범위 밖
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

  const unplacedDirections = getUnplacedDirections(mode, readiness)

  const cancelAllMutation = useCancelAllOrdersMutation(strategy.id)
  const cancelOneMutation = useCancelOneOrderMutation(strategy.id)

  function handleCancelOne(id: string) {
    cancelOneMutation.mutate(id)
  }

  return (
    <div className="space-y-2">
      {bannerText && (
        <div className="flex items-center gap-2 rounded-[var(--r-md)] bg-warn-bg px-3.5 py-2.5 text-base font-semibold text-warn">
          <AlertTriangle className="size-4 shrink-0" />
          <span className="whitespace-pre-line">{bannerText}</span>
        </div>
      )}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base lg:text-lg">다음 주문</CardTitle>
              <p className="text-base text-muted-foreground mt-0.5">
                {canExecute ? '매 거래일 개장 시 자동실행' : '일시정지 중, 자동실행 되지 않음'}
              </p>
            </div>
            {canExecute && (
              <button
                type="button"
                onClick={() => {
                  const messages = executeBlockMessages(mode, marketStatusMessage, isConfirmedHoliday, readiness)
                  if (messages.length > 0) {
                    messages.forEach((message) => toast.info(message))
                    return
                  }
                  execute()
                }}
                disabled={isExecuting || (mode === 'preview' && orders.length === 0)}
                className={cn(
                  buttonVariants({ variant: 'brand' }),
                  'gap-1.5 text-sm px-3 py-1.5 rounded-md whitespace-nowrap shrink-0',
                )}
              >
                {isExecuting ? '주문 중...' : '바로 주문'}
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {mode === 'executed' ? (
            <ExecutedBody
              placedOrders={placedOrders}
              orders={orders}
              unplacedDirections={unplacedDirections}
              readiness={readiness}
              onCancelAll={() =>
                cancelAllMutation.mutate(undefined, {
                  onSuccess: (r) => {
                    if (r.failedCount === 0) {
                      toast.success(`${r.cancelledCount}건 모두 취소됐습니다`)
                    } else {
                      toast.warning(`${r.cancelledCount}건 취소, ${r.failedCount}건 실패. KIS에서 직접 확인하세요.`)
                    }
                  },
                })
              }
              cancelAllPending={cancelAllMutation.isPending}
              onCancelOne={handleCancelOne}
              cancellingId={cancelOneMutation.isPending ? cancelOneMutation.variables : null}
              cancelPending={cancelOneMutation.isPending}
            />
          ) : (
            <PreviewBody
              preview={preview}
              orders={orders}
              isLoadingPreview={isLoadingPreview}
              isPreviewError={isPreviewError}
              previewError={previewError}
              canExecute={canExecute}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
