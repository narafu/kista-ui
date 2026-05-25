'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusDot } from '@/components/common/StatusDot'
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
import { pauseStrategy, resumeStrategy, deleteStrategy } from '@/lib/api/strategies'
import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import type { Strategy } from '@/types/strategy'

interface Props {
  strategy: Strategy
  onChanged?: () => void
}

export function StrategyCard({ strategy, onChanged }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  async function handleToggle() {
    setLoading(true)
    try {
      if (strategy.status === 'ACTIVE') {
        await pauseStrategy(strategy.id)
        toast.success('전략이 중지되었습니다')
      } else {
        await resumeStrategy(strategy.id)
        toast.success('전략이 재개되었습니다')
      }
      onChanged?.()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? '처리에 실패했습니다' : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteStrategy(strategy.id)
      toast.success('전략이 삭제되었습니다')
      setDeleteOpen(false)
      onChanged?.()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? '삭제에 실패했습니다' : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="p-6 flex-1 flex flex-col gap-6">
        {/* 헤더: 전략 타입 배지 + 상태 */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 h-[22px] rounded-full text-[11px] font-semibold whitespace-nowrap bg-rose-50 text-rose-600">
            {strategy.type}
          </span>
          <StatusDot status={(strategy.status as 'ACTIVE' | 'PAUSED') ?? 'UNKNOWN'} />
        </div>

        {/* 정보 */}
        <div className="grid grid-cols-2 gap-6 flex-1">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">종목</p>
            <p className="text-lg font-semibold">{strategy.ticker}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">매수 배수</p>
            <p className="text-lg font-semibold">{strategy.multiple}×</p>
          </div>
        </div>

        {/* 버튼: 하단 고정 */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleToggle}
            disabled={loading}
          >
            {loading ? '처리 중...' : strategy.status === 'ACTIVE' ? '중지' : '재개'}
          </Button>

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
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? '삭제 중...' : '삭제'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
