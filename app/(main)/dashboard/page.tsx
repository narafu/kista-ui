import { getAuthToken } from '@shared/lib/auth/token'
import { getMonthlyHolidays } from '@entities/market'
import { getCachedAccounts } from '@shared/lib/cache/cached-api'
import { DashboardEmpty } from '@widgets/dashboard/DashboardEmpty'
import { DashboardOverview } from '@widgets/dashboard/DashboardOverview'
import type { Account } from '@entities/account'

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

  return (
    <DashboardOverview
      holidays={holidays}
      calendarYear={calendarYear}
      calendarMonth={calendarMonth}
    />
  )
}
