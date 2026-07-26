import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { adminUsersQueryOptions } from '@entities/admin'
import { getMe } from '@entities/user'
import { AdminUsersContent } from '@widgets/admin-user-list'
import { parseRangePreset } from '@shared/lib/date-range'
import { createQueryClient } from '@shared/lib/query'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const { range: rawRange, from, to } = await searchParams
  const range = parseRangePreset(rawRange, 'all')
  const token = await getAuthToken()
  const queryClient = createQueryClient()
  const me = token ? await getMe(token).catch(() => null) : null
  if (token) await queryClient.prefetchQuery(adminUsersQueryOptions(undefined, token))

  return (
    <div>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AdminUsersContent currentUserId={me?.id ?? null} range={range} from={from} to={to} />
      </HydrationBoundary>
    </div>
  )
}
