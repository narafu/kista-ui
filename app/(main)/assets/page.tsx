import type { Metadata } from 'next'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { getActiveGroupId } from '@shared/lib/auth/activeGroup'
import { assetSnapshotListQueryOptions, financeGroupListQueryOptions, monthlyClosingListQueryOptions } from '@entities/finance'
import { createQueryClient } from '@shared/lib/query'
import { AssetsDashboard } from './AssetsDashboard'

export const metadata: Metadata = {
  title: '재무 | KISTA',
  description: '개인 자산·부채 기록을 관리합니다',
}

export default async function AssetsPage() {
  const [token, groupId] = await Promise.all([getAuthToken(), getActiveGroupId()])
  const queryClient = createQueryClient()
  if (token) {
    await Promise.all([
      queryClient.prefetchQuery(assetSnapshotListQueryOptions(groupId, token)).catch(() => undefined),
      queryClient.prefetchQuery(monthlyClosingListQueryOptions(groupId, token)).catch(() => undefined),
      // useActiveGroupId()가 그룹 목록으로 저장된 groupId 유효성을 검증한다 — 프리페치 없으면
      // 클라이언트가 이 쿼리를 새로 fetch하는 동안 groupId가 뒤늦게 바뀌어 위 두 쿼리의 SSR
      // 하이드레이션 결과가 새 캐시 키 아래서 버려질 수 있다.
      queryClient.prefetchQuery(financeGroupListQueryOptions(token)).catch(() => undefined),
    ])
  }
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AssetsDashboard />
    </HydrationBoundary>
  )
}
