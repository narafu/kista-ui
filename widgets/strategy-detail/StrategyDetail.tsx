'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { KpiCard } from '@widgets/kpi-card'
import { RevealableValue } from '@widgets/revealable-value'
import { StrategyTradesTab } from '@widgets/cycle-history'
import {
  useDeleteStrategyMutation,
  useExecuteStrategyMutation,
  usePauseStrategyMutation,
  useResumeStrategyMutation,
  seedBadgeClass,
} from '@entities/strategy'
import {
  useStrategyOrderPreviewQuery,
  useCancelAllOrdersMutation,
  useCancelOneOrderMutation,
} from '@entities/order'
import { useAccountMarginQuery } from '@entities/account'
import { useMonthlyHolidaysQuery } from '@entities/market'
import { useMeta } from '@entities/meta'
import { cn, toNum } from '@shared/lib/utils'
import { fmtUsd } from '@shared/lib/format'
import { ApiError } from '@shared/lib/api-client'
import type { Strategy } from '@entities/strategy'
import type { SkipReason, PlacedOrder } from '@entities/order'
import { OrderRows } from './OrderRows'
import { StrategyOrderHistory } from './StrategyOrderHistory'

const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  NO_CYCLE_HISTORY: '첫 매매 전입니다. 사이클 정보가 아직 없습니다.',
  NO_PRIVACY_BASE: '기준 매매표가 없습니다.',
}

function previewErrorMsg(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return '전략 사이클 정보를 찾을 수 없습니다.'
    if (error.status === 503) return '증권사 API에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  }
  return '주문 미리보기를 불러오는 중 오류가 발생했습니다.'
}

interface Props {
  accountId: string
  accountNoMasked: string
  accountNo?: string
  strategy: Strategy
}

export function StrategyDetail({ accountId, accountNoMasked, accountNo, strategy }: Props) {
  const { push } = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [manualOrders, setManualOrders] = useState<PlacedOrder[] | null>(null)

  const { data: preview, isLoading: isLoadingPreview, isError: isPreviewError, error: previewError } = useStrategyOrderPreviewQuery(strategy.id)

  const serverOrders = preview?.todayOrders ?? []
  const hasServerOrders = serverOrders.length > 0
  const placedOrders = manualOrders ?? (hasServerOrders ? serverOrders : [])
  const mode: 'preview' | 'executed' = manualOrders !== null || hasServerOrders ? 'executed' : 'preview'
  const position = preview?.position ?? null
  const orders = preview?.orders ?? []

  // 매수 주문이 있을 때만 브로커 실잔고 조회 — 부족분은 프론트에서 계산
  const hasBuyOrders = orders.some(o => o.direction === 'BUY')
  const { items: marginItems, isLoading: isMarginLoading } = useAccountMarginQuery(accountId, {
    enabled: !isLoadingPreview && hasBuyOrders,
  })
  const totalBuyUsd = hasBuyOrders && !isMarginLoading
    ? orders.filter(o => o.direction === 'BUY').reduce((sum, o) => sum + toNum(o.price) * o.quantity, 0)
    : 0
  const purchasableUsd = marginItems.find(i => i.currency === 'USD')?.purchasableAmount ?? 0
  const otherPlannedUsd = toNum(preview?.otherStrategiesPlannedBuyUsd ?? '0')
  const previewDeficit = hasBuyOrders && !isMarginLoading
    ? Math.max(0, totalBuyUsd + otherPlannedUsd - purchasableUsd)
    : 0
  const hasDeficit = previewDeficit > 0

  const today = new Date()
  const { holidays } = useMonthlyHolidaysQuery(today.getFullYear(), today.getMonth() + 1)
  const todayStr = today.toISOString().slice(0, 10)
  const dayOfWeek = today.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const isHoliday = isWeekend || holidays.includes(todayStr)
  const canExecute = strategy.status === 'ACTIVE'

  const deleteMutation = useDeleteStrategyMutation(() => push(`/accounts/${accountId}`))
  const pauseMutation = usePauseStrategyMutation()
  const resumeMutation = useResumeStrategyMutation()
  const executeMutation = useExecuteStrategyMutation(strategy.id)
  const cancelAllMutation = useCancelAllOrdersMutation(strategy.id)
  const cancelOneMutation = useCancelOneOrderMutation(strategy.id)
  const toggleLoading = pauseMutation.isPending || resumeMutation.isPending
  const loading = toggleLoading || deleteMutation.isPending

  function handleToggle() {
    if (strategy.status === 'ACTIVE') {
      pauseMutation.mutate(strategy.id)
    } else {
      resumeMutation.mutate(strategy.id)
    }
  }

  function handleCancelOne(id: string) {
    cancelOneMutation.mutate(id, {
      onSuccess: () => {
        const remaining = placedOrders.filter((x) => x.id !== id)
        setManualOrders(remaining.length === 0 ? null : remaining)
      },
    })
  }

  const toggleLabel = toggleLoading ? '처리 중...' : strategy.status === 'ACTIVE' ? '중지' : '재개'

  const { labelOf, findStrategyType } = useMeta()
  const cycleSeedLabel = labelOf('cycleSeedTypes', strategy.cycleSeedType)
  const usesDivisionCount = (findStrategyType(strategy.type)?.divisionCounts?.length ?? 0) > 0
  const seedBadgeCls = seedBadgeClass(strategy.cycleSeedType)

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-5">
          <span className="inline-flex items-center px-2.5 h-[22px] lg:h-[28px] rounded-full text-xs lg:text-sm font-semibold whitespace-nowrap bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400">
            {strategy.type}
          </span>
          {/* eslint-disable-next-line react-doctor/rendering-conditional-render */}
          {usesDivisionCount && (
            <span className="inline-flex items-center px-2 h-[22px] lg:h-[28px] rounded-full text-xs lg:text-sm font-medium whitespace-nowrap bg-muted text-muted-foreground">
              {strategy.divisionCount}분할
            </span>
          )}
          {strategy.isReverseMode && (
            <span className="inline-flex items-center px-2 h-[22px] lg:h-[28px] rounded-full text-xs lg:text-sm font-semibold whitespace-nowrap bg-amber-50 text-amber-600">
              리버스모드
            </span>
          )}
          <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 h-[22px] lg:h-[28px] rounded-full text-xs lg:text-sm font-semibold whitespace-nowrap',
            strategy.status === 'ACTIVE' ? 'bg-status-ok-bg text-status-ok' : 'bg-warn-bg text-warn',
          )}>
            <span className={cn('size-1.5 rounded-full shrink-0', strategy.status === 'ACTIVE' ? 'bg-status-ok' : 'bg-warn')} />
            {strategy.status}
          </span>
          <RevealableValue
            value={accountNo ?? accountNoMasked}
            hiddenDisplay={accountNoMasked}
            className="ml-auto text-sm lg:text-base text-muted-foreground"
          />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="다음 사이클"
          value={<span className={cn('inline-flex items-center px-2.5 h-[28px] lg:h-[36px] rounded-full text-sm lg:text-base font-semibold whitespace-nowrap', seedBadgeCls)}>{cycleSeedLabel}</span>}
        />
        <KpiCard
          label="시작금액"
          value={strategy.initialUsdDeposit != null
            ? <span className="inline-flex items-center text-xl lg:text-3xl font-bold">{`$${fmtUsd(strategy.initialUsdDeposit)}`}</span>
            : <span className="inline-flex items-center text-sm lg:text-base text-muted-foreground font-normal">미설정</span>
          }
        />
      </div>

      {/* eslint-disable-next-line react-doctor/rendering-conditional-render */}
      {usesDivisionCount && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoadingPreview ? (
            <>
              <KpiCard label="회차(T)" skeleton />
              <KpiCard label="단위금액(회)" skeleton />
              <KpiCard label="기준가" skeleton />
              <KpiCard label="목표가" skeleton />
            </>
          ) : isPreviewError ? (
            <Card className="col-span-2 lg:col-span-4">
              <CardContent className="p-5 text-sm text-muted-foreground text-center">
                {previewErrorMsg(previewError)}
              </CardContent>
            </Card>
          ) : position ? (
            <>
              <KpiCard label="회차(T)" value={`${position.currentRound.toFixed(1)}회차`} />
              <KpiCard label="단위금액(회)" value={`$${fmtUsd(toNum(position.unitAmount))}`} />
              <KpiCard label="기준가" value={`$${fmtUsd(toNum(position.referencePrice))}`} />
              <KpiCard label="목표가" value={`$${fmtUsd(toNum(position.targetPrice))}`} />
            </>
          ) : (
            <Card className="col-span-2 lg:col-span-4">
              <CardContent className="p-5 text-sm text-muted-foreground text-center">
                {preview?.skipReason ? SKIP_REASON_LABELS[preview.skipReason] : '다음 주문 정보를 불러올 수 없습니다.'}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base lg:text-lg">다음 주문</CardTitle>
              <p className="text-sm lg:text-base text-muted-foreground mt-0.5">매 거래일 개장 시 자동실행</p>
              {hasBuyOrders && !isMarginLoading && hasDeficit && (
                <p className="hidden lg:flex items-center gap-1.5 mt-1.5 text-sm lg:text-base text-amber-600 dark:text-amber-400">
                  <span className="inline-flex items-center px-2 h-[20px] lg:h-[24px] rounded-full text-xs lg:text-sm font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
                    예수금 부족
                  </span>
                  ${fmtUsd(previewDeficit)} 부족
                </p>
              )}
            </div>
            {canExecute && mode === 'preview' && (
              <button
                type="button"
                onClick={() => {
                  if (isHoliday) { toast.info('오늘은 미국 증시 휴장일입니다'); return }
                  if (hasDeficit) { toast.info('예수금이 부족합니다'); return }
                  executeMutation.mutate(undefined, {
                    onSuccess: (placed) => { setManualOrders(placed) },
                  })
                }}
                disabled={executeMutation.isPending || orders.length === 0 || isMarginLoading}
                className={cn(
                  'inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md',
                  'bg-gradient-to-br from-rose-500 to-rose-700 text-white font-semibold',
                  'shadow-[0_1px_4px_rgba(225,29,72,0.30)] hover:opacity-90 transition-opacity disabled:opacity-50',
                  (isHoliday || hasDeficit) && 'opacity-50 cursor-not-allowed',
                )}
              >
                {executeMutation.isPending ? '주문 중...' : '바로 주문'}
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {mode === 'executed' ? (
            <div>
              <div className="flex items-center justify-between px-6 py-3 border-b border-border">
                <p className="text-sm lg:text-base uppercase tracking-widest font-semibold text-amber-600">
                  {placedOrders.length > 0 ? `${placedOrders.length}건 접수됨` : '접수됨'}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    cancelAllMutation.mutate(undefined, {
                      onSuccess: (r) => {
                        if (r.failedCount === 0) {
                          toast.success(`${r.cancelledCount}건 모두 취소됐습니다.`)
                          setManualOrders(null)
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
            <p className="text-sm lg:text-base text-muted-foreground text-center px-6 py-4">로딩 중...</p>
          ) : isPreviewError ? (
            <p className="text-sm lg:text-base text-muted-foreground text-center px-6 py-4">{previewErrorMsg(previewError)}</p>
          ) : orders.length === 0 ? (
            <p className="text-sm lg:text-base text-muted-foreground text-center px-6 py-4">
              {preview?.skipReason ? SKIP_REASON_LABELS[preview.skipReason] : '예정된 주문이 없습니다.'}
            </p>
          ) : (
            <div>
              {hasBuyOrders && isMarginLoading && (
                <div className="px-6 py-3 border-b border-border">
                  <div className="h-4 w-64 bg-muted animate-pulse rounded" />
                </div>
              )}
              {hasBuyOrders && !isMarginLoading && hasDeficit && (
                <div className="lg:hidden px-6 py-2.5 border-b border-border flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center px-2 h-[20px] rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
                    예수금 부족
                  </span>
                  {`$${fmtUsd(previewDeficit)} 부족`}
                </div>
              )}
              <OrderRows orders={orders} />
            </div>
          )}
        </CardContent>
      </Card>

      <StrategyOrderHistory strategyId={strategy.id} />

      <StrategyTradesTab strategyId={strategy.id} />

      <Card>
        <CardContent className="p-5 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleToggle} disabled={loading}>
            {toggleLabel}
          </Button>

          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogTrigger
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'flex-1 text-destructive hover:text-destructive')}
              disabled={loading}
            >
              삭제
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>전략 삭제</AlertDialogTitle>
                <AlertDialogDescription>
                  {strategy.ticker} 전략을 삭제하시겠습니까? 진행 중인 사이클이 종료됩니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>취소</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(strategy.id)}
                  disabled={loading}
                >
                  {deleteMutation.isPending ? '삭제 중...' : '삭제'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
