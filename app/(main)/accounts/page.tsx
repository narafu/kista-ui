import type { Metadata } from 'next'
import { PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@shared/lib/utils'
import { buttonVariants } from '@/components/ui/button'
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">계좌 관리</h1>
        <Link href="/accounts/new" className={cn(buttonVariants({ size: 'sm' }))}>
          <PlusCircle className="size-4 mr-1.5" />
          계좌 등록
        </Link>
      </div>
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <p>등록된 계좌가 없습니다.</p>
          <Link href="/accounts/new" className={cn(buttonVariants({ variant: 'outline' }))}>
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
