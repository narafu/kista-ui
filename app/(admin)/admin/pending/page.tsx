import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { adminUsersQueryOptions } from '@entities/admin'
import { AdminPendingPageContent } from '@widgets/admin-user-list'
import { createQueryClient } from '@shared/lib/query'

export default async function AdminPendingPage() {
  const token = await getAuthToken()
  const queryClient = createQueryClient()
  if (token) await queryClient.prefetchQuery(adminUsersQueryOptions('PENDING', token))

  return (
    <div className="reveal-stagger">
      <HydrationBoundary state={dehydrate(queryClient)}><AdminPendingPageContent /></HydrationBoundary>
    </div>
  )
}
