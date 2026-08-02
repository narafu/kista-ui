import type { Metadata } from 'next'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { notFound } from 'next/navigation'
import { StrategyDetailContent } from '@widgets/strategy-detail'
import { getAuthToken } from '@shared/lib/auth/token'
import { accountDetailQueryOptions } from '@entities/account'
import { strategyDetailQueryOptions } from '@entities/strategy'
import { orderPreviewQueryOptions } from '@entities/order'
import { createQueryClient } from '@shared/lib/query'

interface Props {
  params: Promise<{ id: string; sid: string }>
}

export const metadata: Metadata = {
  title: '전략 상세 | KISTA',
  description: '전략 상세 정보 및 다음 주문 미리보기',
}

export default async function StrategyDetailPage({ params }: Props) {
  const [{ id, sid }, token] = await Promise.all([params, getAuthToken()])

  if (!token) {
    return notFound()
  }

  const queryClient = createQueryClient()
  const [accountResult, strategyResult] = await Promise.allSettled([
    queryClient.fetchQuery(accountDetailQueryOptions(id, token)),
    queryClient.fetchQuery(strategyDetailQueryOptions(id, sid, token)),
  ])
  if (accountResult.status === 'rejected') throw accountResult.reason
  if (strategyResult.status === 'rejected') throw strategyResult.reason
  const account = accountResult.value
  const strategy = strategyResult.value

  if (!account || !strategy) {
    return notFound()
  }

  // "다음 주문" 배너·데이터가 하이드레이션 이후 재요청 없이 첫 페인트부터 보이도록 서버에서 미리 조회
  await queryClient.prefetchQuery(orderPreviewQueryOptions(strategy.id, token)).catch(() => undefined)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StrategyDetailContent
        accountId={id}
        strategyId={sid}
        initialAccount={account}
        initialStrategy={strategy}
      />
    </HydrationBoundary>
  )
}
