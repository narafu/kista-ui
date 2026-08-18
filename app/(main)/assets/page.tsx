import type { Metadata } from 'next'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { assetSnapshotListQueryOptions, monthlyClosingListQueryOptions } from '@entities/finance'
import { createQueryClient } from '@shared/lib/query'
import { AssetsDashboard } from './AssetsDashboard'

export const metadata: Metadata = {
  title: '재무 | KISTA',
  description: '개인 자산·부채 기록을 관리합니다',
}

export default async function AssetsPage() {
  const token = await getAuthToken()
  const queryClient = createQueryClient()
  if (token) {
    await Promise.all([
      queryClient.prefetchQuery(assetSnapshotListQueryOptions(token)).catch(() => undefined),
      queryClient.prefetchQuery(monthlyClosingListQueryOptions(token)).catch(() => undefined),
    ])
  }
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AssetsDashboard />
    </HydrationBoundary>
  )
}
