import type { Metadata } from 'next'
import { dehydrate } from '@tanstack/react-query'
import { notFound } from 'next/navigation'
import { StrategyDetailContent } from '@widgets/strategy-detail'
import { requirePageToken } from '@shared/lib/auth/token'
import { accountDetailQueryOptions } from '@entities/account'
import { strategyDetailQueryOptions } from '@entities/strategy'
import { orderPreviewQueryOptions } from '@entities/order'
import { HydrationBoundary, createQueryClient } from '@shared/lib/query'

interface Props {
  params: Promise<{ id: string; sid: string }>
}

export const metadata: Metadata = {
  title: '전략 상세',
  description: '전략 상세 정보 및 다음 주문 미리보기',
}

export default async function StrategyDetailPage({ params }: Props) {
  const { params: { id, sid }, token } = await requirePageToken(params)

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
  // DCA 상세에는 다음 주문 카드가 없다(제품 결정 D10, 서버 미리보기는 DCA도 지원) — 쓰지 않는 조회는 생략
  if (strategy.type !== 'DCA') {
    await queryClient.prefetchQuery(orderPreviewQueryOptions(strategy.id, token)).catch(() => undefined)
  }

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
