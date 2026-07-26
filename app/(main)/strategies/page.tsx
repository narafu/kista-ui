import type { Metadata } from 'next'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getAuthToken } from '@shared/lib/auth/token'
import { accountListQueryOptions } from '@entities/account'
import { strategyKeys, strategyListAllQueryOptions } from '@entities/strategy'
import { getStrategyOrderPreviewsById } from '@entities/order'
import { AllStrategiesList } from '@widgets/all-strategies'
import { PageHeader } from '@widgets/page-header'
import type { Strategy } from '@entities/strategy'
import type { NextOrderPreview } from '@entities/order'
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
  // 전략별 다음 주문 미리보기(계좌 단위 배치 조회)는 await하지 않고 Promise 그대로 클라이언트에 전달한다 —
  // 전략 카드 그리드의 첫 페인트를 블로킹하지 않고, 배지·배너는 도착하는 대로 카드별 Suspense로 스트리밍된다
  // 실패해도 페이지 전체(error.tsx)로 전파되지 않도록 흡수 — 카드는 미리보기 배지 없이 렌더링됨
  const previewsPromise: Promise<Record<string, NextOrderPreview>> = token
    ? getStrategyOrderPreviewsById(strategies, token).catch((): Record<string, NextOrderPreview> => ({}))
    : Promise.resolve({})
  return (
    <>
      <PageHeader eyebrow="Strategies" title="전략" />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AllStrategiesList previewsPromise={previewsPromise} />
      </HydrationBoundary>
    </>
  )
}
