'use client'

import Link from 'next/link'
import { Pencil } from 'lucide-react'
import { ICON_LINK_GHOST_CLASS } from '@shared/ui/IconButton'

import { useAccountDetailQuery } from '@entities/account'
import { PageHeader } from '@widgets/page-header'
import type { Account } from '@entities/account'
import type { NextOrderPreview } from '@entities/order'
import { AccountDetailTabs } from './AccountDetailTabs'

interface Props {
  accountId: string
  initialAccount: Account
  usdDeposit: number
  posEvalUsd: number
  previewsByStrategyId?: Record<string, NextOrderPreview>
}

export function AccountDetailContent({
  accountId,
  initialAccount,
  usdDeposit,
  posEvalUsd,
  previewsByStrategyId,
}: Props) {
  const { data } = useAccountDetailQuery(accountId)
  const account = data === undefined ? initialAccount : data

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
        usdDeposit={usdDeposit}
        posEvalUsd={posEvalUsd}
        previewsByStrategyId={previewsByStrategyId}
      />
    </div>
  )
}
