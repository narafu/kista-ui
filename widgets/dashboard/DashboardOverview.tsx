import Link from 'next/link'
import { Plus } from 'lucide-react'
import { PageHeader } from '@widgets/page-header'
import { MarketHolidayCalendar } from '@widgets/market-holiday-calendar'
import { MarketChartCard } from '@widgets/dashboard/MarketChartCard'
import { MARKET_CHART_CATEGORIES } from '@widgets/dashboard/marketChartCategories'
import { FearGreedSection } from '@widgets/fear-greed-card'

interface Props {
  holidays: string[]
  calendarYear: number
  calendarMonth: number
}

export function DashboardOverview({
  holidays,
  calendarYear,
  calendarMonth,
}: Props) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">
        <PageHeader
          eyebrow="Dashboard"
          title="대시보드"
          actions={
            <Link
              href="/accounts/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--r-md)] bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors"
            >
              <Plus className="size-4" />
              계좌 등록
            </Link>
          }
        />
        <div className="mb-6">
          <MarketHolidayCalendar holidays={holidays} year={calendarYear} month={calendarMonth} />
        </div>
        <div className="grid grid-cols-3 gap-4 mb-6">
          {MARKET_CHART_CATEGORIES.map((category) => (
            <MarketChartCard key={category.title} category={category} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <FearGreedSection />
        </div>
      </div>

      {/* Mobile */}
      <div className="lg:hidden">
        <div className="mb-4">
          <MarketHolidayCalendar holidays={holidays} year={calendarYear} month={calendarMonth} />
        </div>
        <div className="flex flex-col gap-4 mb-4">
          {MARKET_CHART_CATEGORIES.map((category) => (
            <MarketChartCard key={category.title} category={category} />
          ))}
        </div>
        <div className="flex flex-col gap-4 mb-4">
          <FearGreedSection />
        </div>
      </div>
    </>
  )
}
