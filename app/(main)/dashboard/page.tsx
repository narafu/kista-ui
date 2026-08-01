import { HydrationBoundary, dehydrate } from '@tanstack/react-query'

import { getAuthToken } from '@shared/lib/auth/token'
import { todayKst } from '@shared/lib/format'
import { kstWeekStartDate } from '@shared/lib/date-range'
import { getMonthlyHolidays, getMonthlyHolidaysPublic } from '@entities/market'
import { accountListQueryOptions } from '@entities/account'
import { DashboardContent } from '@widgets/dashboard/DashboardContent'
import { DashboardLogoutErrorToast } from '@features/auth/logout'
import { createQueryClient } from '@shared/lib/query'

export default async function DashboardPage() {
  const token = await getAuthToken()

  const [calendarYear, calendarMonth] = todayKst().split('-').map(Number)
  const initialWeekStartDate = kstWeekStartDate()

  // 비인증: 체결내역 없는 달력만 표시 (휴장일은 public 엔드포인트로 로드)
  let holidays: string[] | undefined
  try {
    holidays = token
      ? await getMonthlyHolidays(calendarYear, calendarMonth, token)
      : await getMonthlyHolidaysPublic(calendarYear, calendarMonth)
  } catch {
    // A failed server fetch must not hydrate a successful empty month for 24 hours.
    holidays = undefined
  }

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
