'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
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
import { StatusDot } from '@widgets/status-dot'
import { KpiCard } from '@widgets/kpi-card'
import { RevealableValue } from '@widgets/revealable-value'
import { StrategyTradesTab } from '@widgets/cycle-history'
import {
  useDeleteStrategyMutation,
  useExecuteStrategyMutation,
  usePauseStrategyMutation,
  useResumeStrategyMutation,
} from '@entities/strategy'
import {
  useStrategyOrderPreviewQuery,
  useCancelAllOrdersMutation,
  useCancelOneOrderMutation,
} from '@entities/order'
import { useMarketSessionQuery, useMonthlyHolidaysQuery } from '@entities/market'
import { cn, toNum } from '@shared/lib/utils'
import { fmtUsd } from '@shared/lib/format'
import { ApiError } from '@shared/lib/api-client'
import type { Strategy } from '@entities/strategy'
import type { SkipReason, PlacedOrder } from '@entities/order'

const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  NO_CYCLE_HISTORY: '첫 매매 전입니다. 사이클 정보가 아직 없습니다.',
  INSUFFICIENT_BALANCE: '예수금 부족으로 다음 주문을 계산할 수 없습니다.',
  NO_PRIVACY_BASE: '기준 매매표가 없습니다.',
}

function previewErrorMsg(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return '전략 사이클 정보를 찾을 수 없습니다.'
    if (error.status === 503) return 'KIS API에 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
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
  const [mode, setMode] = useState<'preview' | 'executed'>('preview')
  const [placedOrders, setPlacedOrders] = useState<PlacedOrder[]>([])

  const { data: preview, isLoading: isLoadingPreview, isError: isPreviewError, error: previewError } = useStrategyOrderPreviewQuery(strategy.id)
  const position = preview?.position ?? null
  const orders = preview?.orders ?? []

  // 새로고침 후 복원: 오늘 PLANNED 주문이 있으면 자동으로 executed 모드로 진입
  useEffect(() => {
    if (!preview?.todayOrders?.length) return
    if (mode === 'executed') return
    setMode('executed')
    setPlacedOrders(preview.todayOrders)
  }, [preview?.todayOrders]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data: marketSession } = useMarketSessionQuery()
  const today = new Date()
  const { holidays } = useMonthlyHolidaysQuery(today.getFullYear(), today.getMonth() + 1)
  const todayStr = today.toISOString().slice(0, 10)
  const isBlocked = marketSession?.session === 'BLOCKED'
  const isHoliday = holidays.includes(todayStr)
  const canExecute = strategy.type === 'INFINITE' && strategy.status === 'ACTIVE'

  const deleteMutation = useDeleteStrategyMutation(() => push(`/accounts/${accountId}`))
  const pauseMutation = usePauseStrategyMutation()
  const resumeMutation = useResumeStrategyMutation()
  const executeMutation = useExecuteStrategyMutation(strategy.id)
  const cancelAllMutation = useCancelAllOrdersMutation(strategy.id)
  const cancelOneMutation = useCancelOneOrderMutation()
  const toggleLoading = pauseMutation.isPending || resumeMutation.isPending
  const loading = toggleLoading || deleteMutation.isPending

  function handleToggle() {
    if (strategy.status === 'ACTIVE') {
      pauseMutation.mutate(strategy.id)
    } else {
      resumeMutation.mutate(strategy.id)
    }
  }

  const toggleLabel = toggleLoading ? '처리 중...' : strategy.status === 'ACTIVE' ? '중지' : '재개'

  const cycleSeedLabel =
    strategy.cycleSeedType === 'NONE'
      ? 'OFF'
      : strategy.cycleSeedType === 'MAX'
        ? 'ON(MAX)'
        : 'ON(유지)'

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-3">
          <span className="inline-flex items-center px-2.5 h-[22px] rounded-full text-[11px] font-semibold whitespace-nowrap bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400">
            {strategy.type}
          </span>
          {strategy.type === 'INFINITE' && (
            <span className="inline-flex items-center px-2 h-[22px] rounded-full text-[11px] font-medium whitespace-nowrap bg-muted text-muted-foreground">
              {strategy.divisionCount}분할
            </span>
          )}
          {strategy.isReverseMode && (
            <span className="inline-flex items-center px-2 h-[22px] rounded-full text-[11px] font-semibold whitespace-nowrap bg-amber-50 text-amber-600">
              리버스모드
            </span>
          )}
          <RevealableValue
            value={accountNo ?? accountNoMasked}
            hiddenDisplay={accountNoMasked}
            className="ml-auto text-[11px] text-muted-foreground"
          />
        </div>
        <div className="grid grid-cols-3 border-t border-border">
          <div className="px-5 py-3 border-r border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">상태</p>
            <StatusDot status={(strategy.status as 'ACTIVE' | 'PAUSED') ?? 'UNKNOWN'} />
          </div>
          <div className="px-5 py-3 border-r border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">다음 사이클</p>
            <p className="text-sm font-semibold text-foreground">{cycleSeedLabel}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">시작금액</p>
            <p className="text-sm font-semibold text-foreground">
              {strategy.initialUsdDeposit != null ? (
                `$${fmtUsd(strategy.initialUsdDeposit)}`
              ) : (
                <span className="text-muted-foreground font-normal">미설정</span>
              )}
            </p>
          </div>
        </div>
      </Card>

      {strategy.type === 'INFINITE' && (
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
            <CardTitle className="text-base">다음 주문 미리보기</CardTitle>
            {canExecute && mode === 'preview' && (
              <button
                type="button"
                onClick={() => {
                  if (isHoliday) { toast.info('오늘은 미국 증시 휴장일입니다'); return }
                  if (isBlocked) { toast.info('주문 불가 시간대입니다'); return }
                  executeMutation.mutate(undefined, {
                    onSuccess: (placed) => { setMode('executed'); setPlacedOrders(placed) },
                  })
                }}
                disabled={executeMutation.isPending || orders.length === 0}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-50',
                  (isBlocked || isHoliday) && 'opacity-50 cursor-not-allowed',
                )}
              >
                {executeMutation.isPending ? '실행 중...' : '지금 실행'}
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {mode === 'executed' ? (
            <div>
              <div className="flex items-center justify-between px-6 py-3 border-b border-border">
                <p className="text-[11px] uppercase tracking-widest font-semibold text-amber-600">
                  {placedOrders.length > 0 ? `${placedOrders.length}건 접수됨` : '접수됨'}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    cancelAllMutation.mutate(undefined, {
                      onSuccess: (r) => {
                        if (r.failedCount === 0) {
                          toast.success(`${r.cancelledCount}건 모두 취소됐습니다.`)
                          setMode('preview')
                          setPlacedOrders([])
                        } else {
                          toast.warning(`${r.cancelledCount}건 취소, ${r.failedCount}건 실패 — KIS에서 직접 확인하세요.`)
                        }
                      },
                    })
                  }
                  disabled={cancelAllMutation.isPending}
                  className="text-xs px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 disabled:opacity-50"
                >
                  {cancelAllMutation.isPending ? '취소 중...' : '전체 취소'}
                </button>
              </div>
              {/* 모바일 리스트 */}
              <ul className="lg:hidden">
                {placedOrders.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 text-sm px-6 py-3 border-b border-border last:border-b-0">
                    <span className={cn('inline-flex items-center px-2 h-[20px] rounded-full text-[10px] font-semibold', o.direction === 'BUY' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400' : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400')}>
                      {o.direction === 'BUY' ? '매수' : '매도'}
                    </span>
                    <span className="font-medium">{o.ticker}</span>
                    <span className="text-muted-foreground">{o.quantity}주</span>
                    <span className="ml-auto font-semibold">${fmtUsd(toNum(o.price))}</span>
                    <button
                      type="button"
                      onClick={() =>
                        cancelOneMutation.mutate(o.id, {
                          onSuccess: () => {
                            const remaining = placedOrders.filter((x) => x.id !== o.id)
                            setPlacedOrders(remaining)
                            if (remaining.length === 0) setMode('preview')
                          },
                        })
                      }
                      disabled={cancelOneMutation.isPending}
                      className="text-[11px] px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-rose-600 disabled:opacity-50"
                    >
                      취소
                    </button>
                  </li>
                ))}
              </ul>
              {/* PC 테이블 */}
              <table className="hidden lg:table w-full">
                <thead>
                  <tr>
                    <th className="px-5 py-2.5 text-left text-[11px] uppercase tracking-widest text-rose-500 dark:text-rose-400 bg-muted/50 border-b border-border font-semibold">구분</th>
                    <th className="px-5 py-2.5 text-left text-[11px] uppercase tracking-widest text-rose-500 dark:text-rose-400 bg-muted/50 border-b border-border font-semibold">종목</th>
                    <th className="px-5 py-2.5 text-right text-[11px] uppercase tracking-widest text-rose-500 dark:text-rose-400 bg-muted/50 border-b border-border font-semibold">수량</th>
                    <th className="px-5 py-2.5 text-right text-[11px] uppercase tracking-widest text-rose-500 dark:text-rose-400 bg-muted/50 border-b border-border font-semibold">주문가</th>
                    <th className="px-5 py-2.5 text-right text-[11px] uppercase tracking-widest text-rose-500 dark:text-rose-400 bg-muted/50 border-b border-border font-semibold">취소</th>
                  </tr>
                </thead>
                <tbody>
                  {placedOrders.map((o) => (
                    <tr key={o.id} className="border-b border-border last:border-b-0">
                      <td className="px-5 py-3">
                        <span className={cn('inline-flex items-center px-2 h-[20px] rounded-full text-[10px] font-semibold', o.direction === 'BUY' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400' : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400')}>
                          {o.direction === 'BUY' ? '매수' : '매도'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold">{o.ticker}</td>
                      <td className="px-5 py-3 text-sm text-muted-foreground text-right">{o.quantity}주</td>
                      <td className="px-5 py-3 text-sm font-semibold text-right">${fmtUsd(toNum(o.price))}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            cancelOneMutation.mutate(o.id, {
                              onSuccess: () => {
                                const remaining = placedOrders.filter((x) => x.id !== o.id)
                                setPlacedOrders(remaining)
                                if (remaining.length === 0) setMode('preview')
                              },
                            })
                          }
                          disabled={cancelOneMutation.isPending}
                          className="text-[11px] px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-rose-600 disabled:opacity-50"
                        >
                          취소
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

            </div>
          ) : isLoadingPreview ? (
            <p className="text-sm text-muted-foreground text-center px-6 py-4">로딩 중...</p>
          ) : isPreviewError ? (
            <p className="text-sm text-muted-foreground text-center px-6 py-4">{previewErrorMsg(previewError)}</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center px-6 py-4">예정된 주문이 없습니다.</p>
          ) : (
            <div>
              {/* 모바일 리스트 */}
              <ul className="lg:hidden">
                {orders.map((o, i) => (
                  <li
                    key={`${o.ticker}-${o.direction}-${i}`}
                    className="flex items-center gap-3 text-sm px-6 py-3 border-b border-border last:border-b-0"
                  >
                    <span className={cn('inline-flex items-center px-2 h-[20px] rounded-full text-[10px] font-semibold', o.direction === 'BUY' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400' : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400')}>
                      {o.direction === 'BUY' ? '매수' : '매도'}
                    </span>
                    <span className="font-medium">{o.ticker}</span>
                    <span className="text-muted-foreground">{o.quantity}주</span>
                    <span className="ml-auto font-semibold">${fmtUsd(toNum(o.price))}</span>
                  </li>
                ))}
              </ul>
              {/* PC 테이블 */}
              <table className="hidden lg:table w-full">
                <thead>
                  <tr>
                    <th className="px-5 py-2.5 text-left text-[11px] uppercase tracking-widest text-rose-500 dark:text-rose-400 bg-muted/50 border-b border-border font-semibold">구분</th>
                    <th className="px-5 py-2.5 text-left text-[11px] uppercase tracking-widest text-rose-500 dark:text-rose-400 bg-muted/50 border-b border-border font-semibold">종목</th>
                    <th className="px-5 py-2.5 text-right text-[11px] uppercase tracking-widest text-rose-500 dark:text-rose-400 bg-muted/50 border-b border-border font-semibold">수량</th>
                    <th className="px-5 py-2.5 text-right text-[11px] uppercase tracking-widest text-rose-500 dark:text-rose-400 bg-muted/50 border-b border-border font-semibold">주문가</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={`${o.ticker}-${o.direction}-${i}`} className="border-b border-border last:border-b-0">
                      <td className="px-5 py-3">
                        <span className={cn('inline-flex items-center px-2 h-[20px] rounded-full text-[10px] font-semibold', o.direction === 'BUY' ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400' : 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400')}>
                          {o.direction === 'BUY' ? '매수' : '매도'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold">{o.ticker}</td>
                      <td className="px-5 py-3 text-sm text-muted-foreground text-right">{o.quantity}주</td>
                      <td className="px-5 py-3 text-sm font-semibold text-right">${fmtUsd(toNum(o.price))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
