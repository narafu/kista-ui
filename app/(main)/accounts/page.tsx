import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { AccountCard } from '@/components/common/AccountCard'
import { createClient } from '@/lib/supabase/server'
import { listAccounts } from '@/lib/api/accounts'
import type { Account } from '@/types/account'

export default async function AccountsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  let accounts: Account[] = []
  if (session?.access_token) {
    accounts = await listAccounts(session.access_token).catch((): Account[] => [])
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">계좌 관리</h1>
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <p>등록된 계좌가 없습니다.</p>
          <Link href="/accounts/new" className={cn(buttonVariants({ variant: 'outline' }))}>
            첫 계좌 등록하기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <Link key={account.id} href={`/accounts/${account.id}`}>
              <AccountCard account={account} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
