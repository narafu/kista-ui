import type { ReactNode } from 'react'
import { MarketChartCard } from '@widgets/dashboard/MarketChartCard'
import { MARKET_CHART_CATEGORIES } from '@widgets/dashboard/marketChartCategories'

interface Props {
  marketPanels: ReactNode
}

// 시장 패널·차트는 PC·모바일 공용 트리 하나로 렌더한다 — 반응형 분기를 CSS 숨김으로 두 벌 마운트하면
// 차트 인스턴스·조회 상태가 중복된다
export function DashboardMarkets({ marketPanels }: Props) {
  return (
    <>
      {/* 달력 | CNN 공탐 | 크립토 공탐 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {marketPanels}
      </div>
      {/* 시장 차트 3개 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {MARKET_CHART_CATEGORIES.map((category) => (
          <MarketChartCard key={category.title} category={category} />
        ))}
      </div>
    </>
  )
}
