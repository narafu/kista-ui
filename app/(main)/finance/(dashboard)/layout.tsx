import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { assetSnapshotListQueryOptions, financeGroupListQueryOptions, monthlyClosingListQueryOptions } from '@entities/finance'
import { createQueryClient } from '@shared/lib/query'
import { FinanceHeader } from './FinanceHeader'
import { FinancePeriodProvider } from './FinancePeriodProvider'

// 탭(자산/수입/소비/저축/설정) 페이지가 전부 client component라 각자 metadata를 export할 수
// 없다(Next.js 제약) — 그룹 전체에 하나의 정적 title만 부여한다. 기존에도 client 탭 전환이라
// 탭 이동 시 title이 바뀌지 않았으므로 동작 변화는 없다.
export const metadata: Metadata = {
  title: '가계부 | KISTA',
  description: '개인 자산·부채·수입·소비·저축 기록을 관리합니다',
}

export default async function FinanceDashboardLayout({ children }: { children: ReactNode }) {
  const token = await getAuthToken()
  const queryClient = createQueryClient()
  if (token) {
    await Promise.all([
      queryClient.prefetchQuery(assetSnapshotListQueryOptions(token)).catch(() => undefined),
      queryClient.prefetchQuery(monthlyClosingListQueryOptions(token)).catch(() => undefined),
      // 월 마감 판정 스코프(useMonthlyClosingScopeGroupId)가 그룹 목록에서 나온다 — 프리페치 없으면
      // 첫 렌더에 개인 스코프로 판정했다가 목록 로드 후 그룹 스코프로 뒤집혀 잠김 표시가 깜빡인다.
      queryClient.prefetchQuery(financeGroupListQueryOptions(token)).catch(() => undefined),
    ])
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FinancePeriodProvider>
        <FinanceHeader />
        {children}
      </FinancePeriodProvider>
    </HydrationBoundary>
  )
}
