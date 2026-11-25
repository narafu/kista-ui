'use client'

import dynamic from 'next/dynamic'
import { asyncFallback } from '@shared/ui/AsyncSection'
import { Surface } from '@shared/ui/Surface'
import { SectionTitle } from '@shared/ui/SectionTitle'
import { cn } from '@shared/lib/utils'
import { MONTHLY_TREND_RANGE_OPTIONS } from '@entities/finance'
import type { TrendRange } from '@entities/finance'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'

const AssetTrendInner = dynamic(() => import('./AssetTrendInner'), {
  ssr: false,
  loading: () => asyncFallback({ isLoading: true, skeleton: 'chart', fallbackClassName: 'min-h-[240px] flex-1 sm:min-h-[280px]' }),
})

interface Props {
  className?: string
  month?: string
  range: TrendRange
  onRangeChange: (range: TrendRange) => void
}

export function AssetTrend({ className, month, range, onRangeChange }: Props) {
  return (
    <Surface size="compact" className={cn('flex flex-col gap-4 overflow-hidden text-sm', className)}>
      <div className="flex items-center justify-between gap-1 pb-3">
        <SectionTitle>월별 추이</SectionTitle>
        <div>
          <SegmentedToggle aria-label="추이 기간" options={MONTHLY_TREND_RANGE_OPTIONS} value={range} onChange={onRangeChange} />
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <AssetTrendInner month={month} range={range} />
      </div>
    </Surface>
  )
}
