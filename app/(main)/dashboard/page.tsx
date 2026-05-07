import { PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AccountCard } from '@/components/common/AccountCard'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'
import { listAccounts } from '@/lib/api/accounts'
import type { Account } from '@/types/account'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  let accounts: Account[] = []
  if (session?.access_token) {
    try {
      accounts = await listAccounts(session.access_token)
    } catch {
      // 조회 실패 시 빈 배열
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <Link href="/accounts/new" className={cn(buttonVariants({ size: 'sm' }))}>
          <PlusCircle className="h-4 w-4 mr-1.5" />
          계좌 등록
        </Link>
      </div>

      {/* 운용 계좌 수 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">운용 계좌</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{accounts.length}개</p>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">수익 통계</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">계좌 상세에서 확인하세요</p>
          </CardContent>
        </Card>
      </div>

      {/* 계좌 목록 */}
      <div>
        <h2 className="text-lg font-semibold mb-3">계좌 목록</h2>
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
    </div>
  )
}
