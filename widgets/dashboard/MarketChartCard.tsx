'use client'

import dynamic from 'next/dynamic'
import { asyncFallback } from '@shared/ui/AsyncSection'
import { Surface } from '@shared/ui/Surface'
import type { MarketChartCategory } from './marketChartCategories'

const MarketChartCardInner = dynamic(() => import('./MarketChartCardInner'), {
  ssr: false,
  loading: () => asyncFallback({ isLoading: true, skeleton: 'chart', fallbackClassName: 'h-[280px]' }),
})

interface Props {
  category: MarketChartCategory
}

export function MarketChartCard({ category }: Props) {
  return (
    <Surface size="compact" className="flex flex-col gap-2">
      <MarketChartCardInner category={category} />
    </Surface>
  )
}
