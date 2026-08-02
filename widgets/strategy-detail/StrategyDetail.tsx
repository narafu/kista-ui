'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StrategyTradesTab } from '@widgets/cycle-history'
import { useManageStrategyMutations } from '@features/strategy/manage-strategy'
import { useStrategyOrderPreviewQuery, computeOrderReadiness } from '@entities/order'
import type { Strategy } from '@entities/strategy'
import { nextOrderBannerText } from './orderBannerCopy'
import { useTodayMarketStatus } from './useTodayMarketStatus'
import { StrategyMetaSection } from './StrategyMetaSection'
import { NextOrderCard } from './NextOrderCard'
import { DeleteStrategyDialog } from './DeleteStrategyDialog'
import { StrategyOrderHistory } from './StrategyOrderHistory'

interface Props {
  accountId: string
  strategy: Strategy
}

export function StrategyDetail({ accountId, strategy }: Props) {
  const { push } = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: preview, isLoading: isLoadingPreview, isError: isPreviewError, error: previewError } = useStrategyOrderPreviewQuery(strategy.id)

  const placedOrders = preview?.todayOrders ?? []
  const mode: 'preview' | 'executed' = placedOrders.length > 0 ? 'executed' : 'preview'

  // 카드와 동일한 공용 판정 — "오늘 계획된 주문 중 실제 미접수 방향이 있는가" 기준
  const readiness = computeOrderReadiness(preview)

  const { marketStatusMessage, isConfirmedHoliday } = useTodayMarketStatus()
  const canExecute = strategy.status === 'ACTIVE'
  const bannerText = nextOrderBannerText(canExecute, mode, isConfirmedHoliday, marketStatusMessage, readiness)

  const { pause, resume, remove, execute, isPausing, isResuming, isDeleting, isExecuting } = useManageStrategyMutations({
    onDeleted: () => push(`/accounts/${accountId}`),
    strategyId: strategy.id,
  })
  const toggleLoading = isPausing || isResuming
  const loading = toggleLoading || isDeleting

  function handleToggle() {
    if (strategy.status === 'ACTIVE') {
      pause(strategy)
    } else {
      resume(strategy)
    }
  }

  const toggleLabel = toggleLoading ? '처리 중...' : strategy.status === 'ACTIVE' ? '중지' : '재개'

  return (
    <div className="space-y-4">
      <StrategyMetaSection
        strategy={strategy}
        preview={preview}
        isLoadingPreview={isLoadingPreview}
        isPreviewError={isPreviewError}
        previewError={previewError}
      />

      <NextOrderCard
        strategy={strategy}
        preview={preview}
        isLoadingPreview={isLoadingPreview}
        isPreviewError={isPreviewError}
        previewError={previewError}
        readiness={readiness}
        mode={mode}
        canExecute={canExecute}
        bannerText={bannerText}
        marketStatusMessage={marketStatusMessage}
        isConfirmedHoliday={isConfirmedHoliday}
        execute={execute}
        isExecuting={isExecuting}
      />

      <StrategyOrderHistory strategyId={strategy.id} />

      <StrategyTradesTab strategyId={strategy.id} />

      <Card>
        <CardContent className="p-5 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleToggle} disabled={loading}>
            {toggleLabel}
          </Button>

          <DeleteStrategyDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            ticker={strategy.ticker}
            onConfirm={() => remove(strategy)}
            disabled={loading}
            isDeleting={isDeleting}
          />
        </CardContent>
      </Card>
    </div>
  )
}
