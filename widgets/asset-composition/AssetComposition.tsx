'use client'

import dynamic from 'next/dynamic'
import { asyncFallback } from '@shared/ui/AsyncSection'
import { Surface } from '@shared/ui/Surface'
import { SectionTitle } from '@shared/ui/SectionTitle'
import { cn } from '@shared/lib/utils'
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
    <Surface size="flush" className={cn('flex flex-col gap-4 overflow-hidden py-4 text-sm', className)}>
      <div className="flex items-center justify-between gap-1 px-4 pb-3">
        <SectionTitle>월별 구성비</SectionTitle>
        <div>
          <SegmentedToggle aria-label="구성비 기간" options={MONTHLY_TREND_RANGE_OPTIONS} value={range} onChange={onRangeChange} />
        </div>
      </div>
      <div className="px-2 pb-4 sm:px-6 sm:pb-6">
        <AssetCompositionInner month={month} range={range} />
      </div>
    </Surface>
  )
}
