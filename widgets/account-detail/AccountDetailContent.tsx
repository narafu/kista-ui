'use client'

import Link from 'next/link'

import { useQuery } from '@tanstack/react-query'
import { accountLedgerTotalsQueryOptions, useAccountDetailQuery } from '@entities/account'
import { accountPortfolioQueryOptions } from '@entities/trade'
import { isMockBroker } from '@shared/lib/api-schema'
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
  // MOCK 계좌는 주식 포트폴리오 대상이 아니라 서버 prefetch와 같은 조건으로 스킵
  const { data: portfolio } = useQuery({
    ...accountPortfolioQueryOptions(accountId),
    enabled: !!account && !isMockBroker(account.broker),
  })
  const ledgerQuery = useQuery({
    ...accountLedgerTotalsQueryOptions(accountId),
    enabled: !!account,
  })

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
        deposit={portfolio?.summary?.deposit ?? 0}
        posEvalUsd={portfolio?.summary?.posEvalUsd ?? 0}
        ledgerTotals={ledgerQuery.data}
        ledgerTotalsError={ledgerQuery.isError && !ledgerQuery.data}
      />
    </div>
  )
}
