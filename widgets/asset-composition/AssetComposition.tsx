'use client'

import dynamic from 'next/dynamic'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MONTHLY_TREND_RANGE_OPTIONS } from '@entities/finance'
import type { TrendRange } from '@entities/finance'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'

const AssetCompositionInner = dynamic(() => import('./AssetCompositionInner'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground sm:h-[280px]">
      차트 불러오는 중…
    </div>
  ),
})

interface Props {
  className?: string
  month?: string
  range: TrendRange
  onRangeChange: (range: TrendRange) => void
}

export function AssetComposition({ className, month, range, onRangeChange }: Props) {
  return (
    <Card className={className}>
      <CardHeader className="items-center pb-3">
        <CardTitle className="text-base lg:text-lg">월별 구성비</CardTitle>
        <CardAction>
          <SegmentedToggle aria-label="구성비 기간" options={MONTHLY_TREND_RANGE_OPTIONS} value={range} onChange={onRangeChange} />
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pb-4 sm:px-6 sm:pb-6">
        <AssetCompositionInner month={month} range={range} />
      </CardContent>
    </Card>
  )
}
