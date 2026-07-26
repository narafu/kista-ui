import type { Metadata } from 'next'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { notFound } from 'next/navigation'
import { AccountDetailTabs } from '@widgets/account-detail'
import { PageHeader } from '@widgets/page-header'
import { getAuthToken } from '@shared/lib/auth/token'
import { isMockBroker } from '@shared/lib/api-schema'
import { accountKeys, accountListQueryOptions } from '@entities/account'
import { getAccountPortfolio } from '@entities/trade'
import { strategyListByAccountQueryOptions } from '@entities/strategy'
import { getAccountOrderPreviews } from '@entities/order'
import type { PortfolioSummary } from '@entities/trade'
import type { Account } from '@entities/account'
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
  const strategiesPromise = queryClient.prefetchQuery(strategyListByAccountQueryOptions(id, token)).catch(() => undefined)
  // 전략별 다음 주문 미리보기 — 서버에서 미리 채워 카드 목록의 배지·배너가 첫 페인트부터 보이게 함 (계좌 단위 배치 조회 1회)
  const previewsPromise = getAccountOrderPreviews(id, token).catch(() => ({}))

  await queryClient.prefetchQuery(accountListQueryOptions(token)).catch(() => undefined)
  const accounts = queryClient.getQueryData<Account[]>(accountKeys.list()) ?? []
  const account = accounts.find((a) => a.id === id)
  if (!account) {
    return notFound()
  }

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
    <div className="space-y-4">
      <PageHeader
        eyebrow="계좌 관리"
        title={account.nickname}
        actions={
          <Link
            href={`/accounts/${id}/edit`}
            aria-label="계좌 수정"
            className="relative inline-flex items-center justify-center size-11 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Pencil className="size-4" />
          </Link>
        }
      />

      <HydrationBoundary state={dehydrate(queryClient)}>
        <AccountDetailTabs
          account={account}
          usdDeposit={usdDeposit}
          posEvalUsd={posEvalUsd}
          previewsByStrategyId={previewsByStrategyId}
        />
      </HydrationBoundary>
    </div>
  )
}
