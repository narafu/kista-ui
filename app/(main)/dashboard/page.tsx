import { PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AccountCard } from '@/components/common/AccountCard'
import { ProfitDisplay } from '@/components/common/ProfitDisplay'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MOCK_ACCOUNTS, MOCK_PROFIT_SUMMARY } from '@/lib/mock-data'

export default function DashboardPage() {
  const totalProfitLoss = MOCK_PROFIT_SUMMARY.totalProfitLoss
  const totalRate = MOCK_PROFIT_SUMMARY.totalProfitLossRate

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <Link href="/accounts/new" className={cn(buttonVariants({ size: 'sm' }))}>
          <PlusCircle className="h-4 w-4 mr-1.5" />
          계좌 등록
        </Link>
      </div>

      {/* 수익 요약 stat 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">운용 계좌</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{MOCK_ACCOUNTS.length}개</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">이번 달 손익</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfitDisplay amount={totalProfitLoss} className="text-2xl" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">수익률</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalRate >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {totalRate >= 0 ? '+' : ''}{totalRate.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 계좌 목록 */}
      <div>
        <h2 className="text-lg font-semibold mb-3">계좌 목록</h2>
        {MOCK_ACCOUNTS.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <p>등록된 계좌가 없습니다.</p>
            <Link href="/accounts/new" className={cn(buttonVariants({ variant: 'outline' }))}>
              첫 계좌 등록하기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MOCK_ACCOUNTS.map((account) => (
              <Link key={account.id} href={`/accounts/${account.id}`}>
                <AccountCard account={account} profitLoss={120.5} profitLossRate={8.3} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
