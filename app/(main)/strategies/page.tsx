import type { Metadata } from 'next'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { accountListQueryOptions } from '@entities/account'
import { strategyKeys, strategyListAllQueryOptions } from '@entities/strategy'
import { getStrategyOrderPreviewsById } from '@entities/order'
import { AllStrategiesList } from '@widgets/all-strategies'
import { PageHeader } from '@widgets/page-header'
import type { Strategy } from '@entities/strategy'
import { createQueryClient } from '@shared/lib/query'

export const metadata: Metadata = {
  title: '전략 | KISTA',
}

export default async function StrategiesPage() {
  const token = await getAuthToken()
  const queryClient = createQueryClient()
  if (token) {
    await Promise.all([
      queryClient.prefetchQuery(strategyListAllQueryOptions(token)).catch(() => undefined),
      queryClient.prefetchQuery(accountListQueryOptions(token)).catch(() => undefined),
    ])
  }
  const strategies = queryClient.getQueryData<Strategy[]>(strategyKeys.listAll()) ?? []
  // 전략별 다음 주문 미리보기(계좌 단위 배치 조회)는 서버에서 await해 완전히 resolve된 값만 클라이언트로 넘긴다 —
  // 미해결 Promise를 그대로 넘기면(구 스트리밍 방식) RSC 스트림이 중간에 끊길 때(Safari 네트워크 전환 등)
  // 클라이언트의 use()가 rejected promise를 render 중 throw해 페이지 전체가 에러 화면으로 떨어졌다
  const previewsByStrategyId = token
    ? await getStrategyOrderPreviewsById(strategies, token).catch(() => ({}))
    : {}
  return (
    <>
      <PageHeader eyebrow="Strategies" title="전략" />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AllStrategiesList previewsByStrategyId={previewsByStrategyId} />
      </HydrationBoundary>
    </>
  )
}
