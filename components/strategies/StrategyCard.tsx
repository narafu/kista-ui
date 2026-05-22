'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useMeta } from '@/components/providers/MetaProvider'
import { StatusDot } from '@/components/common/StatusDot'
import { pauseStrategy, resumeStrategy, deleteStrategy } from '@/lib/api/strategies'
import { ApiError } from '@/lib/api/client'
import type { Strategy } from '@/types/strategy'

interface Props {
  strategy: Strategy
  onChanged?: () => void
}

export function StrategyCard({ strategy, onChanged }: Props) {
  const router = useRouter()
  const { findStrategyType, findTicker, labelOf } = useMeta()
  const [loading, setLoading] = useState(false)

  const typeMeta = findStrategyType(strategy.type)
  const tickerMeta = findTicker(strategy.ticker)
  const statusLabel = labelOf('strategyStatuses', strategy.status)

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
    if (!confirm('이 전략을 삭제하시겠습니까?')) return
    setLoading(true)
    try {
      await deleteStrategy(strategy.id)
      toast.success('전략이 삭제되었습니다')
      onChanged?.()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? '삭제에 실패했습니다' : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2.5 h-[22px] rounded-full text-[11px] font-semibold whitespace-nowrap bg-rose-50 text-rose-600">
                {typeMeta?.label ?? strategy.type}
              </span>
              <StatusDot status={(strategy.status as 'ACTIVE' | 'PAUSED') ?? 'UNKNOWN'} />
            </div>
            <p className="text-xs text-muted-foreground">{statusLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">종목</p>
            <p className="font-semibold">{tickerMeta?.label ?? strategy.ticker}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">매수 배수</p>
            <p className="font-semibold">{strategy.multiple}</p>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleToggle}
            disabled={loading}
          >
            {loading ? '처리 중...' : strategy.status === 'ACTIVE' ? '중지' : '재개'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            삭제
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
