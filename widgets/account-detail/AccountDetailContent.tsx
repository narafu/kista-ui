'use client'

import Link from 'next/link'

import { useQuery } from '@tanstack/react-query'
import { useAccountDetailQuery } from '@entities/account'
import { accountPortfolioQueryOptions, cryptoPortfolioQueryOptions } from '@entities/trade'
import { isCryptoBroker, isMockBroker } from '@shared/lib/api-schema'
import { PageHeader } from '@widgets/page-header'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@shared/lib/utils'
import type { Account } from '@entities/account'
import { AccountDetailTabs } from './AccountDetailTabs'

interface Props {
  accountId: string
  initialAccount: Account
}

export function AccountDetailContent({
  accountId,
  initialAccount,
}: Props) {
  const { data } = useAccountDetailQuery(accountId)
  const account = data === undefined ? initialAccount : data
  const isCrypto = !!account && isCryptoBroker(account.broker)
  // MOCK·코인 계좌는 주식 포트폴리오 대상이 아니라 서버 prefetch와 같은 조건으로 스킵
  const { data: portfolio } = useQuery({
    ...accountPortfolioQueryOptions(accountId),
    enabled: !!account && !isMockBroker(account.broker) && !isCrypto,
  })
  const cryptoQuery = useQuery({ ...cryptoPortfolioQueryOptions(accountId), enabled: isCrypto })

  if (!account) return null

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="계좌 목록"
        eyebrowHref="/accounts"
        title={account.nickname}
        actions={
          <Link
            href={`/accounts/${accountId}/edit`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
          >
            수정
          </Link>
        }
      />

      <AccountDetailTabs
        account={account}
        usdDeposit={portfolio?.summary?.usdDeposit ?? 0}
        posEvalUsd={portfolio?.summary?.posEvalUsd ?? 0}
        cryptoPortfolio={cryptoQuery.data}
        cryptoPortfolioError={cryptoQuery.isError && !cryptoQuery.data}
      />
    </div>
  )
}
