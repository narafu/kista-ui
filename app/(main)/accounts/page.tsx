import type { Metadata } from 'next'
import { Landmark } from 'lucide-react'
import { PageHeader } from '@widgets/page-header'
import { AccountsGrid } from '@widgets/accounts-grid/AccountsGrid'
import { getAuthToken } from '@shared/lib/auth/token'
import { getCachedAccounts, getCachedStrategies } from '@shared/lib/cache/cached-api'
import { NewAccountButton } from '@features/account/create-account'
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
          <NewAccountButton className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--r-md)] bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors disabled:opacity-60">
            계좌 등록
          </NewAccountButton>
        }
      />
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center gap-5 py-16 text-center">
          <div className="rounded-full bg-muted p-4">
            <Landmark className="size-7 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-foreground">등록된 계좌가 없습니다</p>
            <p className="text-sm text-muted-foreground">
              한국투자증권 계좌를 연결해 자동 분할매매를 시작하세요.
            </p>
          </div>
          <NewAccountButton
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--r-md)] text-sm font-medium transition-colors disabled:opacity-60"
            style={{ background: 'var(--rose-50)', color: 'var(--rose-600)' }}
          >
            계좌 등록하기
          </NewAccountButton>
        </div>
      ) : (
        <AccountsGrid accounts={accounts} strategiesByAccount={strategiesByAccount} />
      )}
    </div>
  )
}
