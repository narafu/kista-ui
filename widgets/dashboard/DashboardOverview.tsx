import Link from 'next/link'
import { Plus } from 'lucide-react'
import { PageHeader } from '@widgets/page-header'
import { AccountCard } from '@widgets/account-card'
import { MarketHolidayCalendar } from '@widgets/market-holiday-calendar'
import { DashboardKpiSection } from '@widgets/dashboard/DashboardKpiSection'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'

interface Props {
  accounts: Account[]
  strategiesByAccount: Strategy[][]
  totalAssetUsd: number
  marketValueUsd: number
  totalEvalProfit: number
  weightedReturnRate: number
  totalAssetUsdActual: number
  totalEvalProfitUsd: number
  holidays: string[]
  calendarYear: number
  calendarMonth: number
}

export function DashboardOverview({
  accounts,
  strategiesByAccount,
  totalAssetUsd,
  marketValueUsd,
  totalEvalProfit,
  weightedReturnRate,
  totalAssetUsdActual,
  totalEvalProfitUsd,
  holidays,
  calendarYear,
  calendarMonth,
}: Props) {
  const kpiProps = {
    totalAssetKrw: totalAssetUsd,
    totalEvalProfitKrw: totalEvalProfit,
    totalAssetUsd: totalAssetUsdActual,
    totalEvalProfitUsd,
    weightedReturnRate,
    marketValueUsd,
  }

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
        <div className="grid grid-cols-3 gap-4 mb-6">
          <MarketHolidayCalendar holidays={holidays} year={calendarYear} month={calendarMonth} />
          <DashboardKpiSection {...kpiProps} variant="desktop" />
        </div>
        <div className="flex items-end justify-between mb-3">
          <h2 className="text-[17px] font-bold">계좌 목록</h2>
          <Link href="/accounts" className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors">
            전체 보기 →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((account, i) => (
            <AccountCard key={account.id} account={account} strategies={strategiesByAccount[i]} />
          ))}
        </div>
      </div>

      {/* Mobile */}
      <div className="lg:hidden">
        <DashboardKpiSection {...kpiProps} variant="mobile" />
        <div className="mb-4">
          <MarketHolidayCalendar holidays={holidays} year={calendarYear} month={calendarMonth} />
        </div>
      </div>
    </>
  )
}
