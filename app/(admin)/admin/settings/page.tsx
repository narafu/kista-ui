import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { adminSettingsQueryOptions } from '@entities/admin-settings'
import { AdminSettingsForm } from '@features/admin/settings'
import { SystemCategoryManager } from '@features/finance/manage-categories'
import { createQueryClient } from '@shared/lib/query'

export default async function AdminSettingsPage() {
  const token = await getAuthToken()
  if (!token) return null
  const queryClient = createQueryClient()
  await queryClient.prefetchQuery(adminSettingsQueryOptions(token))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">운영 설정</h1>
        <p className="mt-1 text-sm text-muted-foreground">신규 가입·계좌·전략 생성 정책</p>
      </div>
      <HydrationBoundary state={dehydrate(queryClient)}><AdminSettingsForm /></HydrationBoundary>

      <div className="mt-10 mb-6">
        <h2 className="text-2xl font-extrabold">가계부 공통카테고리</h2>
        <p className="mt-1 text-sm text-muted-foreground">모든 그룹에 공통으로 노출되는 시스템 카테고리를 관리합니다</p>
      </div>
      <SystemCategoryManager />
    </div>
  )
}
