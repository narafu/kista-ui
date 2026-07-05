'use client'

import dynamic from 'next/dynamic'
import { Surface } from '@shared/ui/Surface'
import type { MarketChartCategory } from './marketChartCategories'

const MarketChartCardInner = dynamic(() => import('./MarketChartCardInner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
      차트 불러오는 중…
    </div>
  ),
})

interface Props {
  category: MarketChartCategory
}

export function MarketChartCard({ category }: Props) {
  return (
    <Surface className="p-5 flex flex-col gap-2">
      <MarketChartCardInner category={category} />
    </Surface>
  )
}
