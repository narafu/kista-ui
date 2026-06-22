import { getAuthToken } from '@shared/lib/auth/token'
import { getMonthlyHolidays } from '@entities/market'
import { getCachedAccounts } from '@shared/lib/cache/cached-api'
import { DashboardEmpty } from '@widgets/dashboard/DashboardEmpty'
import { DashboardOverview } from '@widgets/dashboard/DashboardOverview'
import type { Account } from '@entities/account'

function pad(n: number) { return String(n).padStart(2, '0') }

function getWeekStartDate(): string {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  now.setDate(now.getDate() - now.getDay()) // 이번 주 일요일
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export default async function DashboardPage() {
  const token = await getAuthToken()

  const now = new Date()
  const calendarYear = now.getFullYear()
  const calendarMonth = now.getMonth() + 1
  const initialWeekStartDate = getWeekStartDate()

  let accounts: Account[] = []
  let holidays: string[] = []

  if (token) {
    try { accounts = await getCachedAccounts(token) } catch {}
    try { holidays = await getMonthlyHolidays(calendarYear, calendarMonth, token) } catch {}
  }

  if (accounts.length === 0) {
    return (
      <DashboardEmpty
        holidays={holidays}
        initialWeekStartDate={initialWeekStartDate}
      />
    )
  }

  return (
    <DashboardOverview
      holidays={holidays}
      initialWeekStartDate={initialWeekStartDate}
      accountIds={accounts.map(a => a.id)}
    />
  )
}
