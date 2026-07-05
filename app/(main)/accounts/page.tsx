import type { Metadata } from 'next'
import { Landmark } from 'lucide-react'
import { PageHeader } from '@widgets/page-header'
import { AccountsGrid } from '@widgets/accounts-grid/AccountsGrid'
import { getAuthToken } from '@shared/lib/auth/token'
import { getCachedAccounts, getCachedStrategies } from '@shared/lib/cache/cached-api'
import { NewAccountButton } from '@features/account/create-account'
import { EmptyState } from '@shared/ui/EmptyState'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'

export const metadata: Metadata = {
  title: '내 계좌 | KISTA',
  description: '연결된 한국투자증권 계좌 목록',
}

export default async function AccountsPage() {
  const token = await getAuthToken()
  const accounts: Account[] = token ? await getCachedAccounts(token).catch((): Account[] => []) : []

  const strategiesByAccount: Strategy[][] = token
    ? await Promise.all(
        accounts.map((a) => getCachedStrategies(a.id, token).catch((): Strategy[] => []))
      )
    : accounts.map(() => [])

  return (
    <div>
      <PageHeader
        eyebrow="계좌 관리"
        title="내 계좌"
        actions={
          <NewAccountButton>계좌 등록</NewAccountButton>
        }
      />
      {accounts.length === 0 ? (
        <EmptyState
          icon={<Landmark className="size-7 text-muted-foreground" />}
          title="등록된 계좌가 없습니다"
          message="한국투자증권 계좌를 연결해 자동 분할매매를 시작하세요."
          action={<NewAccountButton>계좌 등록하기</NewAccountButton>}
        />
      ) : (
        <AccountsGrid accounts={accounts} strategiesByAccount={strategiesByAccount} />
      )}
    </div>
  )
}
