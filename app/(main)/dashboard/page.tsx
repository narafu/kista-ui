import { HydrationBoundary, dehydrate } from '@tanstack/react-query'

import { getAuthToken } from '@shared/lib/auth/token'
import { getMonthlyHolidays, getMonthlyHolidaysPublic } from '@entities/market'
import { accountListQueryOptions } from '@entities/account'
import { DashboardContent } from '@widgets/dashboard/DashboardContent'
import { DashboardLogoutErrorToast } from '@features/auth/logout'
import { createQueryClient } from '@shared/lib/query'

function pad(n: number) { return String(n).padStart(2, '0') }

function getWeekStartDate(): string {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  now.setDate(now.getDate() - now.getDay())
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export default async function DashboardPage() {
  const token = await getAuthToken()

  const now = new Date()
  const calendarYear = now.getFullYear()
  const calendarMonth = now.getMonth() + 1
  const initialWeekStartDate = getWeekStartDate()

  // 비인증: 체결내역 없는 달력만 표시 (휴장일은 public 엔드포인트로 로드)
  const holidays: string[] = token
    ? await getMonthlyHolidays(calendarYear, calendarMonth, token).catch(() => [])
    : await getMonthlyHolidaysPublic(calendarYear, calendarMonth)

  const queryClient = createQueryClient()
  if (token) {
    await queryClient.prefetchQuery(accountListQueryOptions(token))
  }

  return (
    <>
      <DashboardLogoutErrorToast />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <DashboardContent
          holidays={holidays}
          initialWeekStartDate={initialWeekStartDate}
        />
      </HydrationBoundary>
    </>
  )
}
