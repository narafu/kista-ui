'use client'

import { Landmark } from 'lucide-react'

import { NewAccountButton } from '@features/account/create-account'
import { useAccountsQuery } from '@entities/account'
import { EmptyState } from '@shared/ui/EmptyState'
import { AccountsGrid } from './AccountsGrid'

export function AccountsPageContent() {
  const query = useAccountsQuery()
  const accounts = query.data

  if (!accounts && query.isPending) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-40 rounded-[var(--r-lg)] border border-border bg-card animate-pulse" />
        ))}
      </div>
    )
  }

  if (!accounts && query.isError) {
    throw query.error
  }

  if (!accounts || accounts.length === 0) {
    return (
      <EmptyState
        icon={<Landmark className="size-7 text-muted-foreground" />}
        title="등록된 계좌가 없습니다"
        message="한국투자증권 계좌를 연결해 자동 분할매매를 시작하세요."
        action={<NewAccountButton>계좌 등록하기</NewAccountButton>}
      />
    )
  }

  return <AccountsGrid accounts={accounts} />
}
