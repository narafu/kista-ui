import { getAuthToken } from '@lib/auth/token'
import { getAccountPortfolio } from '@lib/api/trades'
import { getMonthlyHolidays } from '@lib/api/market'
import { getCachedAccounts, getCachedStrategies } from '@lib/cache/cached-api'
import { DashboardEmpty } from '@widgets/dashboard/DashboardEmpty'
import { DashboardOverview } from '@widgets/dashboard/DashboardOverview'
import { aggregatePortfolios } from '@widgets/dashboard/aggregatePortfolios'
import type { Account } from '@/types/account'
import type { PortfolioSnapshot } from '@/types/trade'
import type { Strategy } from '@/types/strategy'

export default async function DashboardPage() {
  const token = await getAuthToken()

  const now = new Date()
  const calendarYear = now.getFullYear()
  const calendarMonth = now.getMonth() + 1

  let accounts: Account[] = []
  let holidays: string[] = []

  if (token) {
    try { accounts = await getCachedAccounts(token) } catch {}
    try { holidays = await getMonthlyHolidays(calendarYear, calendarMonth, token) } catch {}
  }

  if (accounts.length === 0) {
    return <DashboardEmpty holidays={holidays} calendarYear={calendarYear} calendarMonth={calendarMonth} />
  }

  let portfolioRaws: (PortfolioSnapshot | null)[] = accounts.map(() => null)
  let strategiesByAccount: Strategy[][] = accounts.map(() => [])

  if (token) {
    try {
      [portfolioRaws, strategiesByAccount] = await Promise.all([
        Promise.all(accounts.map(a => getAccountPortfolio(a.id, token).catch(() => null))),
        Promise.all(accounts.map(a => getCachedStrategies(a.id, token).catch((): Strategy[] => []))),
      ])
    } catch {}
  }

  const { totalAssetUsd, marketValueUsd, totalEvalProfit, weightedReturnRate } =
    aggregatePortfolios(portfolioRaws)

  return (
    <DashboardOverview
      accounts={accounts}
      strategiesByAccount={strategiesByAccount}
      totalAssetUsd={totalAssetUsd}
      marketValueUsd={marketValueUsd}
      totalEvalProfit={totalEvalProfit}
      weightedReturnRate={weightedReturnRate}
      holidays={holidays}
      calendarYear={calendarYear}
      calendarMonth={calendarMonth}
    />
  )
}
