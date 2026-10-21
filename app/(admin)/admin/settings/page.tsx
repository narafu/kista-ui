import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { adminSettingsQueryOptions } from '@entities/admin-settings'
import { AdminSettingsForm } from '@features/admin/settings'
import { SystemCategoryManager } from '@features/finance/manage-categories'
import { PageHeader } from '@widgets/page-header'
import { createQueryClient } from '@shared/lib/query'

export const metadata: Metadata = {
  title: '운영 설정 | KISTA',
}

export default async function AdminSettingsPage() {
  const token = await getAuthToken()
  if (!token) redirect('/login')
  const queryClient = createQueryClient()
  await queryClient.prefetchQuery(adminSettingsQueryOptions(token))

  return (
    <div>
      <PageHeader title="운영 설정" description="신규 가입·계좌·전략 생성 정책" className="mb-6" />
      <HydrationBoundary state={dehydrate(queryClient)}><AdminSettingsForm /></HydrationBoundary>

      <div className="mt-10 mb-6">
        <h2 className="text-base font-bold">가계부 공통 카테고리</h2>
        <p className="mt-1 text-sm text-muted-foreground">모든 그룹에 공통으로 노출되는 카테고리를 관리합니다.</p>
      </div>
      <SystemCategoryManager />
    </div>
  )
}
