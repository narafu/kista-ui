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
  broker?: string
  strategy: Strategy
}

export function StrategyDetail({ accountId, broker, strategy }: Props) {
  const { push } = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: preview, isLoading: isLoadingPreview, isError, error: previewError } = useStrategyOrderPreviewQuery(strategy.id)
  // 재조회 실패는 이미 받은 미리보기를 덮지 않는다 — 데이터가 없을 때만 오류로 본다
  const isPreviewError = isError && !preview

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

  const toggleLabel = toggleLoading ? '처리 중...' : strategy.status === 'ACTIVE' ? '일시중지' : '재개'

  return (
    <div className="space-y-4">
      {/* PC: 전략 정보 / 다음 주문 2단 — 행 높이는 왼쪽이 정하고, 더 긴 다음 주문은 카드 안에서 스크롤한다. 왼쪽이 짧아도 목록이 너무 줄지 않게 최소 높이를 둔다 */}
      <div className="space-y-4 xl:grid xl:grid-cols-2 xl:gap-4 xl:space-y-0">
        <div className="space-y-4">
          <StrategyMetaSection
            strategy={strategy}
            preview={preview}
            isLoadingPreview={isLoadingPreview}
          />
        </div>

        <div className="xl:relative xl:min-h-96">
          <NextOrderCard
            strategy={strategy}
            broker={broker}
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
        </div>
      </div>

      <div className="space-y-4 xl:grid xl:grid-cols-2 xl:items-start xl:gap-4 xl:space-y-0">
        {/* 모바일은 주문 내역이 먼저, PC 2단은 잔고 이력이 왼쪽 */}
        <div className="xl:order-2">
          <StrategyOrderHistory strategyId={strategy.id} />
        </div>

        <div className="xl:order-1">
          <StrategyTradesTab strategyId={strategy.id} />
        </div>
      </div>

      <Card>
        <CardContent className="p-5 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleToggle} disabled={loading}>
            {toggleLabel}
          </Button>

          <DeleteStrategyDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            ticker={strategy.ticker}
            broker={broker}
            onConfirm={() => remove(strategy)}
            disabled={loading}
            isDeleting={isDeleting}
          />
        </CardContent>
      </Card>
    </div>
  )
}
