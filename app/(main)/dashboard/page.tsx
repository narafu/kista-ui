import { HydrationBoundary, dehydrate } from '@tanstack/react-query'

import { getAuthToken } from '@shared/lib/auth/token'
import { isJwtExpired } from '@shared/lib/auth/jwt'
import { todayKst } from '@shared/lib/format'
import { kstWeekStartDate } from '@shared/lib/date-range'
import { monthlyHolidaysQueryOptions } from '@entities/market'
import { accountListQueryOptions } from '@entities/account'
import { DashboardContent } from '@widgets/dashboard/DashboardContent'
import { WeeklyMarketCalendar } from '@widgets/market-holiday-calendar'
import { FearGreedSection } from '@widgets/fear-greed-card'
import { DashboardLogoutErrorToast } from '@features/auth/logout'
import { createQueryClient } from '@shared/lib/query'

export default async function DashboardPage() {
  const token = await getAuthToken()
  const isAuthenticated = !!token && !isJwtExpired(token)

  const [calendarYear, calendarMonth] = todayKst().split('-').map(Number)
  const initialWeekStartDate = kstWeekStartDate()

  const queryClient = createQueryClient()
  // 비인증: 체결내역 없는 달력만 표시 (휴장일은 public 엔드포인트로 로드).
  // 실패한 조회는 dehydrate에 포함되지 않으므로(react-query 기본 shouldDehydrateQuery가
  // status:'success'만 직렬화) 성공한 빈 달로 24시간 hydrate되지 않고 클라이언트가 재조회한다.
  await queryClient.prefetchQuery(monthlyHolidaysQueryOptions(calendarYear, calendarMonth, token)).catch(() => undefined)
  if (isAuthenticated) {
    await queryClient.prefetchQuery(accountListQueryOptions(token))
  }

  return (
    <>
      <DashboardLogoutErrorToast />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <DashboardContent
          isAuthenticated={isAuthenticated}
          marketPanels={
            <>
              <WeeklyMarketCalendar initialWeekStartDate={initialWeekStartDate} isAuthenticated={isAuthenticated} />
              <FearGreedSection />
            </>
          }
        />
      </HydrationBoundary>
    </>
  )
}
