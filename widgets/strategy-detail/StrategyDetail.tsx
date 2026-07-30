'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
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
import { StrategyTradesTab } from '@widgets/cycle-history'
import { seedBadgeClass, strategyStatusAccent, isScheduledStart, scheduledStartBadgeLabel } from '@entities/strategy'
import { useManageStrategyMutations } from '@features/strategy/manage-strategy'
import { useStrategyOrderPreviewQuery, useCancelAllOrdersMutation, useCancelOneOrderMutation, computeOrderReadiness } from '@entities/order'
import { useMonthlyHolidaysQuery } from '@entities/market'
import { useMeta } from '@entities/meta'
import { cn, toNum } from '@shared/lib/utils'
import { fmtUsd, todayKst } from '@shared/lib/format'
import { ApiError } from '@shared/lib/api-client'
import { Badge } from '@shared/ui/Badge'
import { EmptyState } from '@shared/ui/EmptyState'
import { BRAND_GRADIENT_BUTTON_CLASS } from '@shared/ui/brand-button-class'
import type { Strategy } from '@entities/strategy'
import type { SkipReason, NextOrderPreview, OrderReadiness, DirectionReadiness } from '@entities/order'
import { OrderRows } from './OrderRows'
import { StrategyOrderHistory } from './StrategyOrderHistory'

const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  NO_CYCLE_HISTORY: '첫 매매 전입니다. 사이클 정보가 아직 없습니다.',
  NO_PRIVACY_BASE: 'P 매매표가 없습니다.',
}


// 방향별 문구 재료 — 라벨/부족 서식은 BUY·SELL 각각 다르므로 방향마다 한 벌씩 정의하고,
// 우선순위 판정(확인 실패 > 부족 > 충족)은 아래 두 함수가 공유한다
interface DirectionCopy {
  uncertainMessage: string
  formatDeficitMessage: (deficitAmount: number) => string
  sufficientMessage: string
}

const BUY_COPY: DirectionCopy = {
  uncertainMessage: '예수금 확인 실패로 매수 미접수 — 잠시 후 다시 확인해주세요',
  formatDeficitMessage: () => '예수금 부족으로 매수 미접수',
  sufficientMessage: '예수금 충족됨 — 마감 시 매수 재시도 예정',
}

const SELL_COPY: DirectionCopy = {
  uncertainMessage: '판매가능수량 확인 실패로 매도 미접수 — 잠시 후 다시 확인해주세요',
  formatDeficitMessage: (qty) => `판매가능수량 ${qty}주 부족으로 매도 미접수`,
  sufficientMessage: '판매가능수량 충족됨 — 마감 시 매도 재시도 예정',
}

// "미접수" 목록 문구 — 확인 실패 > 부족 > 충족 우선순위로 선택
function directionUnplacedMessage(direction: DirectionReadiness, copy: DirectionCopy): string {
  if (direction.uncertain) return copy.uncertainMessage
  if (direction.hasDeficit) return copy.formatDeficitMessage(direction.deficitAmount)
  return copy.sufficientMessage
}


// 카드 상단 배너 문구(방향 1개분) — 확인 실패 > 부족 우선순위. 확인 실패 문구는 preview 모드에서만
// 노출한다 — executed 모드에서는 아래 "미접수" 목록이 방향별로 확인 실패 사유까지 이미 안내하므로,
// 배너에서 또 보여주면 중복이다
function directionBannerText(mode: 'preview' | 'executed', direction: DirectionReadiness, uncertainBannerMessage: string, formatDeficitBanner: (deficitAmount: number) => string): string | null {
  if (mode === 'preview' && direction.uncertain) return uncertainBannerMessage
  if (!direction.hasDeficit) return null
  return formatDeficitBanner(direction.deficitAmount)
}

// 카드 상단 배너 문구 — 휴장일/예수금·판매가능수량 부족을 "바로 주문" 가능 여부와 함께 안내한다.
// BUY/SELL 부족이 동시에 발생할 수 있어(같은 전략에 두 방향 모두 계획된 경우) 한쪽만 보여주고 끝내지
// 않도록 둘 다 문구를 만든 뒤 합친다
function nextOrderBannerText(canExecute: boolean, mode: 'preview' | 'executed', isHoliday: boolean, marketStatusMessage: string | null, readiness: OrderReadiness): string | null {
  if (!canExecute) return null
  if (mode === 'preview' && marketStatusMessage) return marketStatusMessage
  if (mode === 'preview' && isHoliday) return '오늘은 휴장일입니다'

  const parts = [
    directionBannerText(mode, readiness.buy, '예수금 확인 실패 — 잠시 후 다시 확인해주세요', (amount) =>
      mode === 'preview' ? `예수금 $${fmtUsd(amount)} 부족(장 마감 시 재시도)` : `예수금 $${fmtUsd(amount)} 부족`),
    directionBannerText(mode, readiness.sell, '판매가능수량 확인 실패 — 잠시 후 다시 확인해주세요', (amount) =>
      mode === 'preview' ? `판매가능수량 ${amount}주 부족(장 마감 시 재시도)` : `판매가능수량 ${amount}주 부족`),
  ].filter((part): part is string => part != null)
  return parts.length > 0 ? parts.join(' · ') : null
}

function previewErrorMsg(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return '전략 사이클 정보를 찾을 수 없습니다.'
    if (error.status === 503) return '증권사 API에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  }
  return '주문 미리보기를 불러오는 중 오류가 발생했습니다.'
}

// VR 정기 입출금 부호별 라벨 — 카드 자체가 "운용 방식"을 겸하므로 별도 recurringMode 필드 없이 amount 부호로만 판정한다
function recurringModeLabel(recurringAmount: number): string {
  if (recurringAmount > 0) return `적립식($${fmtUsd(recurringAmount)})`
  if (recurringAmount === 0) return '거치식'
  return `인출식($${fmtUsd(Math.abs(recurringAmount))})`
}

interface Props {
  accountId: string
  strategy: Strategy
  initialPreview?: NextOrderPreview
}

export function StrategyDetail({ accountId, strategy, initialPreview }: Props) {
  const { push } = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: preview, isLoading: isLoadingPreview, isError: isPreviewError, error: previewError } = useStrategyOrderPreviewQuery(strategy.id, initialPreview)

  const placedOrders = preview?.todayOrders ?? []
  const mode: 'preview' | 'executed' = placedOrders.length > 0 ? 'executed' : 'preview'
  const position = preview?.position ?? null
  const orders = preview?.orders ?? []

  // 카드와 동일한 공용 판정 — "오늘 계획된 주문 중 실제 미접수 방향이 있는가" 기준
  const readiness = computeOrderReadiness(preview)

  // executed 모드에서만 의미 있음: preview 모드는 "아직 시도 안 함"과 "전량 거절"을 구분할 수 없다
  const unplacedDirections: Array<'BUY' | 'SELL'> = mode === 'executed'
    ? [...(readiness.buy.unplaced ? (['BUY'] as const) : []), ...(readiness.sell.unplaced ? (['SELL'] as const) : [])]
    : []

  const todayStr = todayKst()
  const [kstYear, kstMonth] = todayStr.split('-').map(Number)
  const { holidays, isError: isHolidayError, loading: isHolidayLoading } = useMonthlyHolidaysQuery(kstYear, kstMonth)
  const dayOfWeek = new Date(todayStr + 'T00:00:00').getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const marketStatusMessage = !isWeekend
    ? isHolidayError
      ? '미국 증시 휴장 여부를 확인하지 못했습니다'
      : isHolidayLoading
        ? '미국 증시 휴장 여부를 확인하는 중입니다'
        : null
    : null
  const isConfirmedHoliday = isWeekend || (!marketStatusMessage && holidays.includes(todayStr))
  const canExecute = strategy.status === 'ACTIVE'
  const bannerText = nextOrderBannerText(canExecute, mode, isConfirmedHoliday, marketStatusMessage, readiness)

  const { pause, resume, remove, execute, isPausing, isResuming, isDeleting, isExecuting } = useManageStrategyMutations({
    onDeleted: () => push(`/accounts/${accountId}`),
    strategyId: strategy.id,
  })
  const cancelAllMutation = useCancelAllOrdersMutation(strategy.id)
  const cancelOneMutation = useCancelOneOrderMutation(strategy.id)
  const toggleLoading = isPausing || isResuming
  const loading = toggleLoading || isDeleting

  function handleToggle() {
    if (strategy.status === 'ACTIVE') {
      pause(strategy)
    } else {
      resume(strategy)
    }
  }

  function handleCancelOne(id: string) {
    cancelOneMutation.mutate(id)
  }

  const toggleLabel = toggleLoading ? '처리 중...' : strategy.status === 'ACTIVE' ? '중지' : '재개'

  const { labelOf, findStrategyType } = useMeta()
  const cycleSeedLabel = labelOf('cycleSeedTypes', strategy.cycleSeedType)
  const strategyTypeMeta = findStrategyType(strategy.type)
  const usesDivisionCount = (strategyTypeMeta?.divisionCounts?.length ?? 0) > 0
  const seedBadgeCls = seedBadgeClass(strategy.cycleSeedType)
  const scheduledStart = isScheduledStart(strategy) // startDate가 오늘 이후면 아직 매매 시작 전

  return (
    <div className="space-y-4">
      {/* 전략 정보 헤더 스트립 — 카드 중첩 대신 얇은 라벨 행 + 균일 타일 그리드 (감사 A-20) */}
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-fg-soft)]">
          <span
            data-testid="strategy-status-accent"
            className="size-2 rounded-full shrink-0"
            style={{ background: strategyStatusAccent(strategy.status) }}
          />
          전략 정보
        </p>
        <div data-testid="strategy-status-group" className="flex flex-wrap items-center justify-end gap-2">
          {scheduledStart && (
            <Badge tone="none" size="md" className="bg-info-bg text-info">
              {scheduledStartBadgeLabel(strategy.startDate!)}
            </Badge>
          )}
          {strategy.isReverseMode && (
            <Badge tone="warn" size="md">리버스모드</Badge>
          )}
          {strategy.status !== 'ACTIVE' && (
            <Badge tone="warn" size="lg" className="border border-warn/20">
              {strategy.status}
            </Badge>
          )}
        </div>
      </div>
      <div data-testid="strategy-meta-grid" className="grid grid-cols-2 gap-3">
        <KpiCard
          label="전략타입"
          value={<span className="inline-flex items-center text-xl lg:text-2xl font-bold">{strategy.type}</span>}
          className="p-4 lg:p-5"
          valueClassName="text-xl lg:text-2xl"
        />
        {strategy.vr ? (
          <KpiCard
            label="운용 방식"
            value={<span className="inline-flex items-center text-xl lg:text-2xl font-bold">{recurringModeLabel(strategy.vr.recurringAmount)}</span>}
            className="p-4 lg:p-5"
            valueClassName="text-xl lg:text-2xl"
          />
        ) : (
          <KpiCard
            label="다음 사이클"
            value={
              <Badge tone="none" size="md" className={cn('h-[28px] lg:h-[36px] text-sm lg:text-base', seedBadgeCls)}>{cycleSeedLabel}</Badge>
            }
            className="p-4 lg:p-5"
          />
        )}
      </div>

      {/* eslint-disable-next-line react-doctor/rendering-conditional-render */}
      {!strategy.vr && (
        <div data-testid="strategy-summary-grid" className="grid grid-cols-2 gap-3">
          <KpiCard
            label={usesDivisionCount ? '분할' : '운용 방식'}
            value={<span className="inline-flex items-center text-xl lg:text-2xl font-bold">{usesDivisionCount ? `${strategy.divisionCount}분할` : '매매표'}</span>}
            className="p-4 lg:p-5"
            valueClassName="text-xl lg:text-2xl"
          />
          <KpiCard
            label="시작금액"
            value={
              strategy.initialUsdDeposit != null ? (
                <span className="inline-flex items-center text-xl lg:text-3xl font-bold">{`$${fmtUsd(strategy.initialUsdDeposit)}`}</span>
              ) : (
                <span className="inline-flex items-center text-sm lg:text-base text-muted-foreground font-normal">미설정</span>
              )
            }
          />
        </div>
      )}

      {/* VR 전용 KPI 그리드 — strategy.vr 존재 시에만 렌더 */}
      {/* eslint-disable-next-line react-doctor/rendering-conditional-render */}
      {strategy.vr && (
        <div data-testid="strategy-vr-grid" className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="주기" value={`${strategy.vr.intervalWeeks}주`} className="order-1 lg:order-2" />
            <KpiCard label="밴드 폭" value={`${strategy.vr.bandWidth}%`} className="order-2 lg:order-1" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="G" value={`${strategy.vr.gradient}`} />
            <KpiCard label="V" value={`$${fmtUsd(strategy.vr.value)}`} />
            <KpiCard
              label="pool"
              value={
                strategy.initialUsdDeposit != null ? (
                  `$${fmtUsd(strategy.initialUsdDeposit)}`
                ) : (
                  <span className="inline-flex items-center text-sm lg:text-base text-muted-foreground font-normal">미설정</span>
                )
              }
            />
            <KpiCard
              label="pool 상한"
              value={`$${fmtUsd(strategy.vr.poolLimit)}`}
              sub={`${(strategy.vr.poolLimitRate * 100).toFixed(0)}%`}
            />
          </div>
        </div>
      )}

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
              <CardContent className="p-5 text-sm text-muted-foreground text-center">{previewErrorMsg(previewError)}</CardContent>
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

      <StrategyOrderHistory strategyId={strategy.id} />

      <StrategyTradesTab strategyId={strategy.id} />

      <Card>
        <CardContent className="p-5 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleToggle} disabled={loading}>
            {toggleLabel}
          </Button>

          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'flex-1 text-destructive hover:text-destructive')} disabled={loading}>
              삭제
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>전략을 삭제하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>{strategy.ticker} 전략을 삭제하시겠습니까? 진행 중인 사이클이 종료됩니다.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>취소</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={() => remove(strategy)} disabled={loading}>
                  {isDeleting ? '삭제 중...' : '삭제'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
