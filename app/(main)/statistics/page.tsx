import type { Metadata } from 'next'
import { getAuthToken } from '@shared/lib/auth/token'
import { NewAccountButton } from '@features/account/create-account'
import { getCachedAccounts } from '@shared/lib/cache/cached-api'
import { ProfitStatsCard } from '@widgets/profit-stats-card'
import { PageHeader } from '@widgets/page-header'
import { RevealableValue } from '@widgets/revealable-value'
import type { Account } from '@entities/account'

export const metadata: Metadata = {
  title: '수익 통계 | KISTA',
  description: '계좌별 수익/손실 통계',
}

export default async function StatisticsPage() {
  const token = await getAuthToken()
  let accounts: Account[] = []
  if (token) accounts = await getCachedAccounts(token).catch((): Account[] => [])

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="통계" title="포트폴리오 분석" />

      {/* 계좌별 손익 통계 */}
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-4">
          <p className="text-[13px]">등록된 계좌가 없습니다.</p>
          <NewAccountButton className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--r-md)] border border-border text-sm font-semibold hover:bg-muted transition-colors text-foreground disabled:opacity-60">
            첫 계좌 등록하기
          </NewAccountButton>
        </div>
      ) : (
        <div>
          <h2 className="text-[17px] font-bold mb-3">계좌별 손익 통계</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {accounts.map((account) => (
              <div key={account.id} className="rounded-[var(--r-lg)] p-5 shadow-[var(--sh-card)] border border-border" style={{ background: 'var(--card)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[14px] font-bold">{account.nickname}</span>
                  <span className="text-[11.5px] text-muted-foreground">
                    <RevealableValue
                      value={account.accountNo ?? account.accountNoMasked}
                      hiddenDisplay={account.accountNoMasked}
                    />
                  </span>
                </div>
                <ProfitStatsCard accountId={account.id} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
