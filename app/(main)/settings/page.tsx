import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { meQueryOptions } from '@entities/user'
import { PageHeader } from '@widgets/page-header'
import { SettingsPageContent } from '@widgets/settings/SettingsPageContent'
import { createQueryClient } from '@shared/lib/query'

export default async function SettingsPage() {
  const token = await getAuthToken()
  const queryClient = createQueryClient()
  if (token) await queryClient.prefetchQuery(meQueryOptions(token))

  return (
    <div className="max-w-[880px]">
      <PageHeader eyebrow="설정" title="계정 설정" />

      <HydrationBoundary state={dehydrate(queryClient)}><SettingsPageContent /></HydrationBoundary>
    </div>
  )
}
