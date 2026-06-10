'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusDot } from '@widgets/status-dot'
import { KpiCard } from '@widgets/kpi-card'
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
import {
  useDeleteStrategyMutation,
  usePauseStrategyMutation,
  useResumeStrategyMutation,
} from '@entities/strategy'
import { StrategyFormDialog } from '@features/strategy/create-strategy'
import { cn } from '@shared/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import type { Strategy } from '@entities/strategy'
import type { NextOrderPositionSnapshot } from '@entities/order'

interface Props {
  accountId: string
  strategy: Strategy
  position?: NextOrderPositionSnapshot | null
  isLoadingPosition?: boolean
  onChanged?: () => void
}

export function StrategyCard({ accountId, strategy, position, isLoadingPosition = false, onChanged }: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const deleteMutation = useDeleteStrategyMutation(() => { setDeleteOpen(false); onChanged?.() })
  const pauseMutation = usePauseStrategyMutation()
  const resumeMutation = useResumeStrategyMutation()
  const toggleLoading = pauseMutation.isPending || resumeMutation.isPending
  const loading = toggleLoading || deleteMutation.isPending

  function handleToggle() {
    if (strategy.status === 'ACTIVE') {
      pauseMutation.mutate(strategy.id, {
        onSuccess: () => onChanged?.(),
        onError: (err) => { void err },
      })
    } else {
      resumeMutation.mutate(strategy.id, {
        onSuccess: () => onChanged?.(),
        onError: (err) => { void err },
      })
    }
  }

  const cycleSeedLabel =
    strategy.cycleSeedType === 'NONE'
      ? '수동'
      : strategy.cycleSeedType === 'MAX'
        ? '자동(MAX)'
        : '자동(유지)'

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 h-[22px] rounded-full text-[11px] font-semibold whitespace-nowrap bg-rose-50 text-rose-600">
            {strategy.type}
          </span>
          <StatusDot status={(strategy.status as 'ACTIVE' | 'PAUSED') ?? 'UNKNOWN'} />
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            다음 사이클
            <span className="px-1.5 py-0.5 rounded bg-muted text-foreground font-semibold">
              {cycleSeedLabel}
            </span>
          </span>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-6 flex-1 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="종목" value={strategy.ticker} />
          <KpiCard
            label="시작금액"
            value={
              strategy.initialUsdDeposit != null
                ? `$${strategy.initialUsdDeposit.toLocaleString('en-US')}`
                : <span className="text-sm font-normal text-muted-foreground">미설정</span>
            }
          />
          {isLoadingPosition ? (
            <>
              <KpiCard label="회차(T)" skeleton />
              <KpiCard label="단위금액(회)" skeleton />
              <KpiCard label="기준가" skeleton />
              <KpiCard label="목표가" skeleton />
            </>
          ) : position ? (
            <>
              <KpiCard label="회차(T)" value={`${position.currentRound.toFixed(1)}회차`} />
              <KpiCard label="단위금액(회)" value={`$${parseFloat(position.unitAmount).toFixed(2)}`} />
              <KpiCard label="기준가" value={`$${parseFloat(position.referencePrice).toFixed(2)}`} />
              <KpiCard label="목표가" value={`$${parseFloat(position.targetPrice).toFixed(2)}`} />
            </>
          ) : null}
        </div>

        <div className="flex gap-2 pt-4 border-t mt-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleToggle}
            disabled={loading}
          >
            {toggleLoading ? '처리 중...' : strategy.status === 'ACTIVE' ? '중지' : '재개'}
          </Button>

          <StrategyFormDialog
            accountId={accountId}
            initial={strategy}
            triggerLabel="수정"
            triggerVariant="ghost"
            disabled={loading}
          />

          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogTrigger
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-destructive hover:text-destructive')}
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
        </div>
      </CardContent>
    </Card>
  )
}
