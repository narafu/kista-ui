import type { Metadata } from 'next'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { equityCurveQueryOptions, statsSummaryQueryOptions } from '@entities/stats'
import { StatsOverview } from '@widgets/stats-overview'
import { createQueryClient } from '@shared/lib/query'
import { todayKst } from '@shared/lib/format'
import { kstDateMinusDays } from '@shared/lib/date-range'

export const metadata: Metadata = {
  title: '성과 | KISTA',
}

// StatsOverview 기본 range='3M'과 동일한 산식(90일 차감)이어야
// 위젯 초기 상태의 query key가 서버 prefetch key와 일치한다.
const DEFAULT_RANGE_DAYS = 90

export default async function StatsPage() {
  const token = await getAuthToken()

  const defaultTo = todayKst()
  const defaultFrom = kstDateMinusDays(DEFAULT_RANGE_DAYS)

  const queryClient = createQueryClient()
  if (token) {
    await Promise.all([
      queryClient.prefetchQuery(statsSummaryQueryOptions(token)).catch(() => undefined),
      queryClient
        .prefetchQuery(equityCurveQueryOptions({ from: defaultFrom, to: defaultTo }, token))
        .catch(() => undefined),
    ])
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StatsOverview defaultFrom={defaultFrom} defaultTo={defaultTo} />
    </HydrationBoundary>
  )
}
