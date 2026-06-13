import Link from 'next/link'
import { Plus } from 'lucide-react'
import { fmtUsd, fmtKrw } from '@shared/lib/format'
import { PageHeader } from '@widgets/page-header'
import { KpiCard } from '@widgets/kpi-card'
import { AccountCard } from '@widgets/account-card'
import { ProfitDisplay } from '@widgets/profit-display'
import { MarketHolidayCalendar } from '@widgets/market-holiday-calendar'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'

interface Props {
  accounts: Account[]
  strategiesByAccount: Strategy[][]
  totalAssetUsd: number
  marketValueUsd: number
  totalEvalProfit: number
  weightedReturnRate: number
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
  holidays,
  calendarYear,
  calendarMonth,
}: Props) {
  const noProfit = marketValueUsd === 0

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
          <KpiCard
            label="총 평가손익"
            value={
              noProfit
                ? <span className="text-muted-foreground text-base font-medium">데이터 없음</span>
                : <ProfitDisplay amount={totalEvalProfit} rate={weightedReturnRate} size="lg" full currency="KRW" />
            }
            sub="현재 보유 포지션 기준"
          />
          <KpiCard
            variant="soft"
            label="총 자산 (KRW)"
            value={`₩${fmtKrw(totalAssetUsd)}`}
            sub={`평가금액 $${fmtUsd(marketValueUsd)} (USD)`}
          />
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
        <div
          className="rounded-[var(--r-lg)] border border-rose-200 p-5 mb-3"
          style={{ background: 'var(--brand-soft-bg)' }}
        >
          <p className="text-[11.5px] font-bold tracking-[0.12em] uppercase text-[var(--brand-fg-soft)] mb-1.5">총 자산</p>
          <div className="text-[30px] font-extrabold text-[var(--brand-fg)] leading-tight">
            ₩{fmtKrw(totalAssetUsd)}
          </div>
        </div>
        <div className="rounded-[var(--r-lg)] border border-border bg-card p-5 mb-4">
          <p className="text-[11.5px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-2">총 평가손익</p>
          {noProfit ? (
            <span className="text-base text-muted-foreground font-medium">데이터 없음</span>
          ) : (
            <ProfitDisplay amount={totalEvalProfit} rate={weightedReturnRate} size="lg" full currency="KRW" />
          )}
        </div>
        <div className="mb-4">
          <MarketHolidayCalendar holidays={holidays} year={calendarYear} month={calendarMonth} />
        </div>
      </div>
    </>
  )
}
