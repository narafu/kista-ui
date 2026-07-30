import type { Metadata } from 'next'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'

import { PageHeader } from '@widgets/page-header'
import { AccountsPageContent } from '@widgets/accounts-grid/AccountsPageContent'
import { getAuthToken } from '@shared/lib/auth/token'
import { accountKeys, accountListQueryOptions } from '@entities/account'
import { strategyListByAccountQueryOptions } from '@entities/strategy'
import { NewAccountButton } from '@features/account/create-account'
import type { Account } from '@entities/account'
import { createQueryClient } from '@shared/lib/query'

export const metadata: Metadata = {
  title: '내 계좌 | KISTA',
  description: '연결된 한국투자증권 계좌 목록',
}

export default async function AccountsPage() {
  const token = await getAuthToken()
  const queryClient = createQueryClient()

  if (token) {
    await queryClient.prefetchQuery(accountListQueryOptions(token))
    const accounts = queryClient.getQueryData<Account[]>(accountKeys.list()) ?? []
    await Promise.all(
      accounts.map((account) =>
        queryClient
          .prefetchQuery(strategyListByAccountQueryOptions(account.id, token))
          .catch(() => undefined),
      ),
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow="계좌 관리"
        title="내 계좌"
        actions={
          <NewAccountButton>계좌 등록</NewAccountButton>
        }
      />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <AccountsPageContent />
      </HydrationBoundary>
    </div>
  )
}
