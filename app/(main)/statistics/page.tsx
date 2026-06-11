import type { Metadata } from 'next'
import { getAuthToken } from '@shared/lib/auth/token'
import { getCurrentPortfolio, getTrades } from '@entities/trade'
import { getCachedAccounts } from '@shared/lib/cache/cached-api'
import { ProfitStatsCard } from '@widgets/profit-stats-card'
import { PageHeader } from '@widgets/page-header'
import { PortfolioSummaryCard } from '@widgets/portfolio-summary-card'
import { TradeHistoryList } from '@widgets/trade-history-list'
import type { Account } from '@entities/account'
import type { TradeHistory, PortfolioSnapshot } from '@entities/trade'

export const metadata: Metadata = {
  title: '수익 통계 | KISTA',
  description: '계좌별 수익/손실 통계 및 거래 내역',
}

export default async function StatisticsPage() {
  const token = await getAuthToken()

  let accounts: Account[] = []
  let portfolio: PortfolioSnapshot | null = null
  let trades: TradeHistory[] = []

  if (token) {
    ;[accounts, portfolio, trades] = await Promise.all([
      getCachedAccounts(token).catch((): Account[] => []),
      getCurrentPortfolio(token).catch(() => null),
      getTrades({}, token).catch((): TradeHistory[] => []),
    ])
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="통계" title="포트폴리오 분석" />

      {/* 포트폴리오 현황 */}
      {portfolio && <PortfolioSummaryCard portfolio={portfolio} />}

      {/* 전체 거래 이력 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[17px] font-bold m-0">전체 거래 이력</h2>
          <a
            href="/api/trades/export"
            className="inline-flex items-center h-8 px-3.5 rounded-lg text-[12.5px] font-semibold border border-border text-foreground no-underline cursor-pointer"
            style={{ background: 'var(--card)' }}
          >
            CSV 내보내기
          </a>
        </div>
        <TradeHistoryList trades={trades} />
      </div>

      {/* 계좌별 손익 통계 */}
      {accounts.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <p className="text-[13px]">등록된 계좌가 없습니다.</p>
        </div>
      ) : (
        <div>
          <h2 className="text-[17px] font-bold mb-3">계좌별 손익 통계</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {accounts.map((account) => (
              <div key={account.id} className="rounded-[var(--r-lg)] p-5 shadow-[var(--sh-card)] border border-border" style={{ background: 'var(--card)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[14px] font-bold">{account.nickname}</span>
                  <span className="text-[11.5px] text-muted-foreground">{account.accountNoMasked}</span>
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
