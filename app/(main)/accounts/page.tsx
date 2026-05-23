import { PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { AccountCard } from '@/components/common/AccountCard'
import { getAuthToken } from '@/lib/auth/token'
import { listAccounts } from '@/lib/api/accounts'
import { listStrategies } from '@/lib/api/strategies'
import type { Account } from '@/types/account'
import type { Strategy } from '@/types/strategy'

export default async function AccountsPage() {
  const token = await getAuthToken()
  let accounts: Account[] = []
  if (token) {
    accounts = await listAccounts(token).catch((): Account[] => [])
  }

  const strategiesByAccount: Strategy[][] = token
    ? await Promise.all(
        accounts.map((a) => listStrategies(a.id, token).catch((): Strategy[] => []))
      )
    : accounts.map(() => [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">계좌 관리</h1>
        <Link href="/accounts/new" className={cn(buttonVariants({ size: 'sm' }))}>
          <PlusCircle className="h-4 w-4 mr-1.5" />
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
