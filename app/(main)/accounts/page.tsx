import type { Metadata } from 'next'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@widgets/page-header'
import { AccountCard } from '@widgets/account-card'
import { getAuthToken } from '@shared/lib/auth/token'
import { getCachedAccounts, getCachedStrategies } from '@shared/lib/cache/cached-api'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'

export const metadata: Metadata = {
  title: '내 계좌 | KISTA',
  description: '연결된 한국투자증권 계좌 목록',
}

export default async function AccountsPage() {
  const token = await getAuthToken()
  let accounts: Account[] = []
  if (token) {
    accounts = await getCachedAccounts(token).catch((): Account[] => [])
  }

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
          <Link
            href="/accounts/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--r-md)] bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors"
          >
            <Plus className="size-4" />
            계좌 등록
          </Link>
        }
      />
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-4">
          <p className="text-[13px]">등록된 계좌가 없습니다.</p>
          <Link
            href="/accounts/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--r-md)] border border-border text-sm font-semibold hover:bg-muted transition-colors text-foreground"
          >
            <Plus className="size-4" />
            첫 계좌 등록하기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account, i) => (
            <AccountCard key={account.id} account={account} strategies={strategiesByAccount[i]} />
          ))}
        </div>
      )}
    </div>
  )
}
