'use client'

import dynamic from 'next/dynamic'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MONTHLY_TREND_RANGE_OPTIONS } from '@entities/finance'
import type { TrendRange } from '@entities/finance'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'

const AssetTrendInner = dynamic(() => import('./AssetTrendInner'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[240px] flex-1 items-center justify-center text-sm text-muted-foreground sm:min-h-[280px]">
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

export function AssetTrend({ className, month, range, onRangeChange }: Props) {
  return (
    <Card className={className}>
      <CardHeader className="items-center pb-3">
        <CardTitle className="text-base lg:text-lg">월별 추이</CardTitle>
        <CardAction>
          <SegmentedToggle aria-label="추이 기간" options={MONTHLY_TREND_RANGE_OPTIONS} value={range} onChange={onRangeChange} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <AssetTrendInner month={month} range={range} />
      </CardContent>
    </Card>
  )
}
