import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { getActiveGroupId } from '@shared/lib/auth/activeGroup'
import { assetSnapshotListQueryOptions, financeGroupListQueryOptions, monthlyClosingListQueryOptions } from '@entities/finance'
import { createQueryClient } from '@shared/lib/query'
import { FinanceHeader } from './FinanceHeader'

// 탭(자산/수입/소비/저축/설정) 페이지가 전부 client component라 각자 metadata를 export할 수
// 없다(Next.js 제약) — 그룹 전체에 하나의 정적 title만 부여한다. 기존에도 client 탭 전환이라
// 탭 이동 시 title이 바뀌지 않았으므로 동작 변화는 없다.
export const metadata: Metadata = {
  title: '가계부 | KISTA',
  description: '개인 자산·부채·수입·소비·저축 기록을 관리합니다',
}

export default async function FinanceDashboardLayout({ children }: { children: ReactNode }) {
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
      <FinanceHeader />
      {children}
    </HydrationBoundary>
  )
}
