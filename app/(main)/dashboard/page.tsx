import { getAuthToken } from '@shared/lib/auth/token'
import { getAccountPortfolio } from '@entities/trade'
import { getMonthlyHolidays } from '@entities/market'
import { getCachedAccounts } from '@shared/lib/cache/cached-api'
import { DashboardEmpty } from '@widgets/dashboard/DashboardEmpty'
import { DashboardOverview } from '@widgets/dashboard/DashboardOverview'
import { aggregatePortfolios } from '@widgets/dashboard/aggregatePortfolios'
import type { Account } from '@entities/account'
import type { PortfolioSummary } from '@entities/trade'

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

  let portfolioRaws: (PortfolioSummary | null)[] = accounts.map(() => null)

  if (token) {
    try {
      portfolioRaws = await Promise.all(accounts.map(a => getAccountPortfolio(a.id, token).catch(() => null)))
    } catch {}
  }

  const { totalDepositUsd, totalPosEvalUsd, totalAssetUsd, exchangeRate, accountEntries } =
    aggregatePortfolios(portfolioRaws, accounts.map(a => ({ id: a.id, nickname: a.nickname })))

  return (
    <DashboardOverview
      totalDepositUsd={totalDepositUsd}
      totalPosEvalUsd={totalPosEvalUsd}
      totalAssetUsd={totalAssetUsd}
      exchangeRate={exchangeRate}
      accountEntries={accountEntries}
      holidays={holidays}
      calendarYear={calendarYear}
      calendarMonth={calendarMonth}
    />
  )
}
