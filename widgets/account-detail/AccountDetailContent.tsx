'use client'

import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { ICON_LINK_GHOST_CLASS } from '@shared/ui/iconButtonStyles'

import { useQuery } from '@tanstack/react-query'
import { useAccountDetailQuery } from '@entities/account'
import { accountPortfolioQueryOptions } from '@entities/trade'
import { isMockBroker } from '@shared/lib/api-schema'
import { PageHeader } from '@widgets/page-header'
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
  // MOCK 계좌는 KIS-live 포트폴리오 조회 대상이 아니라 서버 prefetch와 동일하게 스킵
  const { data: portfolio } = useQuery({
    ...accountPortfolioQueryOptions(accountId),
    enabled: !!account && !isMockBroker(account.broker),
  })

  if (!account) return null

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="계좌 관리"
        title={account.nickname}
        actions={
          <Link
            href={`/accounts/${accountId}/edit`}
            aria-label="계좌 수정"
            title="계좌 수정"
            className={ICON_LINK_GHOST_CLASS}
          >
            <Pencil className="size-4" />
          </Link>
        }
      />

      <AccountDetailTabs
        account={account}
        usdDeposit={portfolio?.summary?.usdDeposit ?? 0}
        posEvalUsd={portfolio?.summary?.posEvalUsd ?? 0}
      />
    </div>
  )
}
