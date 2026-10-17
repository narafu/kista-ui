import type { Metadata } from 'next'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { notFound } from 'next/navigation'
import { AccountDetailContent } from '@widgets/account-detail'
import { requirePageToken } from '@shared/lib/auth/token'
import { isCryptoBroker, isMockBroker } from '@shared/lib/api-schema'
import { accountDetailQueryOptions } from '@entities/account'
import { accountPortfolioQueryOptions, cryptoPortfolioQueryOptions } from '@entities/trade'
import { strategyListByAccountQueryOptions } from '@entities/strategy'
import { getAccountOrderPreviews, seedOrderPreviews } from '@entities/order'
import { createQueryClient } from '@shared/lib/query'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: '계좌 상세 | KISTA',
  description: '계좌 포트폴리오 및 거래 내역',
}

export default async function AccountDetailPage({ params }: Props) {
  const { params: { id }, token } = await requirePageToken(params)

  const queryClient = createQueryClient()
  const account = await queryClient.fetchQuery(accountDetailQueryOptions(id, token))
  if (!account) {
    return notFound()
  }

  const strategiesPromise = queryClient
    .prefetchQuery(strategyListByAccountQueryOptions(id, token))
    .catch(() => undefined)
  // 전략별 다음 주문 미리보기 — 서버에서 미리 채워 카드 목록의 배지·배너가 첫 페인트부터 보이게 함 (계좌 단위 배치 조회 1회)
  const previewsPromise = getAccountOrderPreviews(id, token).catch(() => ({}))

  // MOCK은 KIS-live 포트폴리오 대상이 아니고, 코인 계좌는 주식 포트폴리오를 부르면 400이라 코인 포트폴리오를 대신 채운다
  const portfolioPromise = isMockBroker(account.broker)
    ? undefined
    : isCryptoBroker(account.broker)
      ? queryClient.prefetchQuery(cryptoPortfolioQueryOptions(id, token)).catch(() => undefined)
      : queryClient.prefetchQuery(accountPortfolioQueryOptions(id, token)).catch(() => undefined)

  const [previewsByStrategyId] = await Promise.all([previewsPromise, strategiesPromise, portfolioPromise])

  seedOrderPreviews(queryClient, previewsByStrategyId)

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AccountDetailContent
        accountId={id}
        initialAccount={account}
      />
    </HydrationBoundary>
  )
}
