'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { StrategyTradesTab } from '@widgets/cycle-history'
import {
  useDeleteStrategyMutation,
  usePauseStrategyMutation,
  useResumeStrategyMutation,
} from '@entities/strategy'
import { useStrategyOrderPreviewQuery } from '@entities/order'
import { cn, toNum } from '@shared/lib/utils'
import { fmtUsd } from '@shared/lib/format'
import type { Strategy } from '@entities/strategy'
import type { SkipReason } from '@entities/order'

const SKIP_REASON_LABELS: Record<SkipReason, string> = {
  NO_CYCLE_HISTORY: '첫 매매 전입니다. 사이클 정보가 아직 없습니다.',
  INSUFFICIENT_BALANCE: '예수금 부족으로 다음 주문을 계산할 수 없습니다.',
  NO_PRIVACY_BASE: '기준 매매표가 없습니다.',
}

interface Props {
  accountId: string
  strategy: Strategy
}

export function StrategyDetail({ accountId, strategy }: Props) {
  const router = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: preview, isLoading: isLoadingPreview } = useStrategyOrderPreviewQuery(strategy.id)
  const position = preview?.position ?? null
  const orders = preview?.orders ?? []

  const deleteMutation = useDeleteStrategyMutation(() => router.push(`/accounts/${accountId}`))
  const pauseMutation = usePauseStrategyMutation()
  const resumeMutation = useResumeStrategyMutation()
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
      ? '수동'
      : strategy.cycleSeedType === 'MAX'
        ? '자동(MAX)'
        : '자동(유지)'

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center px-2.5 h-[22px] rounded-full text-[11px] font-semibold whitespace-nowrap bg-rose-50 text-rose-600">
            {strategy.type}
          </span>
          <StatusDot status={(strategy.status as 'ACTIVE' | 'PAUSED') ?? 'UNKNOWN'} />
          <span className="text-sm text-muted-foreground">
            다음 사이클
            <span className="ml-1.5 px-1.5 py-0.5 rounded bg-muted text-foreground font-semibold">
              {cycleSeedLabel}
            </span>
          </span>
          <span className="ml-auto text-sm font-medium text-foreground">
            시작금액{' '}
            {strategy.initialUsdDeposit != null ? (
              `$${fmtUsd(strategy.initialUsdDeposit)}`
            ) : (
              <span className="text-muted-foreground">미설정</span>
            )}
          </span>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoadingPreview ? (
          <>
            <KpiCard label="회차(T)" skeleton />
            <KpiCard label="단위금액(회)" skeleton />
            <KpiCard label="기준가" skeleton />
            <KpiCard label="목표가" skeleton />
          </>
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">다음 주문 미리보기</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingPreview ? (
            <p className="text-sm text-muted-foreground text-center py-4">로딩 중...</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">예정된 주문이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {orders.map((o, i) => (
                <li
                  key={`${o.ticker}-${o.direction}-${i}`}
                  className="flex items-center gap-3 text-sm py-2 border-b border-border last:border-b-0"
                >
                  <span
                    className={cn(
                      'inline-flex items-center px-2 h-[20px] rounded-full text-[10px] font-semibold',
                      o.direction === 'BUY' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600',
                    )}
                  >
                    {o.direction === 'BUY' ? '매수' : '매도'}
                  </span>
                  <span className="font-medium">{o.ticker}</span>
                  <span className="text-muted-foreground">{o.quantity}주</span>
                  <span className="ml-auto font-semibold">${fmtUsd(toNum(o.price))}</span>
                </li>
              ))}
            </ul>
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
