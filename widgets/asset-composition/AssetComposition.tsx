'use client'

import dynamic from 'next/dynamic'
import { asyncFallback } from '@shared/ui/AsyncSection'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MONTHLY_TREND_RANGE_OPTIONS } from '@entities/finance'
import type { TrendRange } from '@entities/finance'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'

const AssetCompositionInner = dynamic(() => import('./AssetCompositionInner'), {
  ssr: false,
  loading: () => asyncFallback({ isLoading: true, skeleton: 'chart', fallbackClassName: 'h-[240px] sm:h-[280px]' }),
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
        <CardTitle role="heading" aria-level={2} className="text-base lg:text-lg">월별 구성비</CardTitle>
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
