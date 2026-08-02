import type { ReactNode } from 'react'
import { PageHeader } from '@widgets/page-header'
import { NewAccountButton } from '@features/account/create-account'
import { MarketChartCard } from '@widgets/dashboard/MarketChartCard'
import { MARKET_CHART_CATEGORIES } from '@widgets/dashboard/marketChartCategories'

interface Props {
  marketPanels: ReactNode
}

export function DashboardOverview({ marketPanels }: Props) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block reveal-stagger">
        <PageHeader
          eyebrow="Dashboard"
          title="대시보드"
          actions={
            <NewAccountButton>계좌 등록</NewAccountButton>
          }
        />
        {/* Row 1: 달력 | CNN 공탐 | 크립토 공탐 */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {marketPanels}
        </div>
        {/* Row 2: 트레이딩뷰 차트 3개 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {MARKET_CHART_CATEGORIES.map((category) => (
            <MarketChartCard key={category.title} category={category} />
          ))}
        </div>
      </div>

      {/* Mobile */}
      <div className="lg:hidden reveal-stagger">
        <div className="flex flex-col gap-4 mb-4">
          {marketPanels}
        </div>
        <div className="flex flex-col gap-4 mb-4">
          {MARKET_CHART_CATEGORIES.map((category) => (
            <MarketChartCard key={category.title} category={category} />
          ))}
        </div>
      </div>
    </>
  )
}
