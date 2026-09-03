import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { adminStatsQueryOptions, adminUsersQueryOptions } from '@entities/admin'
import { AdminOverviewContent } from '@widgets/admin-user-list'
import { createQueryClient } from '@shared/lib/query'

export default async function AdminOverviewPage() {
  const token = await getAuthToken()
  const queryClient = createQueryClient()
  if (token) {
    await Promise.all([
      queryClient.prefetchQuery(adminStatsQueryOptions(token)).catch(() => null),
      queryClient.prefetchQuery(adminUsersQueryOptions('PENDING', undefined, token)).catch(() => null),
    ])
  }

  return (
    <div className="reveal-stagger">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold">개요</h1>
        <p className="text-sm text-muted-foreground mt-1">사용자 현황 및 최근 대기 목록</p>
      </div>

      <HydrationBoundary state={dehydrate(queryClient)}><AdminOverviewContent /></HydrationBoundary>
    </div>
  )
}
