'use client'

import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'
import type { MarketChartCategory } from './marketChartCategories'

const MarketChartCardInner = dynamic(() => import('./MarketChartCardInner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
      차트 불러오는 중...
    </div>
  ),
})

interface Props {
  category: MarketChartCategory
}

export function MarketChartCard({ category }: Props) {
  const { resolvedTheme } = useTheme()
  return (
    <div className="rounded-[var(--r-lg)] p-5 flex flex-col gap-2 bg-card border border-border shadow-[var(--sh-card)]">
      {/* key={resolvedTheme}: 테마 변경 시 완전 재마운트 — applyOptions 타이밍 이슈 방지 */}
      <MarketChartCardInner key={resolvedTheme} category={category} />
    </div>
  )
}
