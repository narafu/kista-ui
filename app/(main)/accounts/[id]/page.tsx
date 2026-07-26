import type { Metadata } from 'next'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { notFound } from 'next/navigation'
import { AccountDetailContent } from '@widgets/account-detail'
import { getAuthToken } from '@shared/lib/auth/token'
import { isMockBroker } from '@shared/lib/api-schema'
import { accountDetailQueryOptions } from '@entities/account'
import { getAccountPortfolio } from '@entities/trade'
import { strategyListByAccountQueryOptions } from '@entities/strategy'
import { getAccountOrderPreviews } from '@entities/order'
import type { PortfolioSummary } from '@entities/trade'
import { createQueryClient } from '@shared/lib/query'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: '계좌 상세 | KISTA',
  description: '계좌 포트폴리오 및 거래 내역',
}

export default async function AccountDetailPage({ params }: Props) {
  const [{ id }, token] = await Promise.all([params, getAuthToken()])

  if (!token) {
    return notFound()
  }

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

  // MOCK 계좌는 KIS-live 포트폴리오 조회 대상이 아니고 값도 화면에서 숨겨지므로 호출 자체를 스킵
  const [portfolioRaw, previewsByStrategyId] = await Promise.all([
    isMockBroker(account.broker)
      ? Promise.resolve(null)
      : getAccountPortfolio(id, token).catch((): PortfolioSummary | null => null),
    previewsPromise,
    strategiesPromise,
  ])

  const usdDeposit = portfolioRaw?.summary?.usdDeposit ?? 0
  const posEvalUsd = portfolioRaw?.summary?.posEvalUsd ?? 0

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AccountDetailContent
        accountId={id}
        initialAccount={account}
        usdDeposit={usdDeposit}
        posEvalUsd={posEvalUsd}
        previewsByStrategyId={previewsByStrategyId}
      />
    </HydrationBoundary>
  )
}
