import { getAuthToken } from '@/lib/auth/token'
import { listAccounts } from '@/lib/api/accounts'
import { PageHeader } from '@/components/common/PageHeader'
import { KpiCard } from '@/components/common/KpiCard'
import { AccountCard } from '@/components/common/AccountCard'
import type { Account } from '@/types/account'
import Link from 'next/link'
import { Plus, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  const token = await getAuthToken()
  const accounts: Account[] = token ? await listAccounts(token).catch(() => []) : []

  // 빈 상태
  if (accounts.length === 0) {
    return (
      <div>
        <PageHeader eyebrow="대시보드" title="환영합니다" />
        <div className="max-w-md mx-auto text-center py-16">
          <div className="size-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="size-8 text-rose-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">아직 연결된 계좌가 없습니다</h2>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            KIS 계좌를 연결하면<br />자동 분할매매가 시작됩니다.
          </p>
          <Link
            href="/accounts/new"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--r-md)] bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 transition-colors"
          >
            <Plus className="size-4" />
            첫 계좌 연결하기
          </Link>
        </div>
      </div>
    )
  }

  // KPI 집계
  const activeCount = accounts.filter(a => a.strategyStatus === 'ACTIVE').length

  return (
    <div>
      <PageHeader
        eyebrow="대시보드"
        title="내 계좌 현황"
        actions={
          <Link
            href="/accounts/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--r-md)] bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors"
          >
            <Plus className="size-4" />
            계좌 추가
          </Link>
        }
      />

      {/* KPI 카드 3개 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <KpiCard
          variant="accent"
          label="연결 계좌"
          value={`${accounts.length}개`}
          sub="전체 계좌 수"
        />
        <KpiCard
          label="운영중"
          value={`${activeCount}개`}
          sub={`${accounts.length - activeCount}개 일시중지`}
        />
        <KpiCard
          label="전략"
          value={accounts.filter(a => a.strategyType === 'INFINITE').length > 0 ? '인피니트' : '프라이버시'}
          sub="운영 전략"
        />
      </div>

      {/* 계좌 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {accounts.map(account => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>
    </div>
  )
}
