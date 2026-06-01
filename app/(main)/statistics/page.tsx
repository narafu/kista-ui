import type { Metadata } from 'next'
import { getAuthToken } from '@/lib/auth/token'
import { getCurrentPortfolio, getTrades } from '@/lib/api/trades'
import { getCachedAccounts } from '@/lib/cache/cached-api'
import { ProfitStatsCard } from '@/components/common/ProfitStatsCard'
import { PageHeader } from '@/components/common/PageHeader'
import { KpiCard } from '@/components/common/KpiCard'
import type { Account } from '@/types/account'
import type { TradeHistory, PortfolioSnapshot } from '@/types/trade'

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
      {portfolio && (
        <div className="rounded-[var(--r-lg)] p-5 shadow-[var(--sh-card)] border border-border mb-5" style={{ background: 'var(--card)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[13.5px] font-semibold">포트폴리오 현황</div>
              <div className="text-[11.5px] text-muted-foreground mt-0.5">최근 종가 기준</div>
            </div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold" style={{ background: 'var(--rose-50)', color: 'var(--rose-600)' }}>
              {portfolio.ticker}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard label="종목" value={portfolio.ticker} />
            <KpiCard label="보유 수량" value={`${portfolio.holdings}주`} />
            <KpiCard label="평단가" value={portfolio.avgPrice != null ? `$${portfolio.avgPrice.toFixed(2)}` : '-'} />
            <KpiCard label="현재가" value={portfolio.currentPrice != null ? `$${portfolio.currentPrice.toFixed(2)}` : '-'} />
            <KpiCard label="평가금액" value={`$${portfolio.marketValueUsd.toFixed(2)}`} />
            <KpiCard label="USD 예수금" value={`$${portfolio.usdDeposit.toFixed(2)}`} />
            <KpiCard label="총 자산" value={`$${portfolio.totalAssetUsd.toFixed(2)}`} variant="soft" />
          </div>
        </div>
      )}

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
        {trades.length === 0 ? (
          <p className="text-[13px] text-muted-foreground py-4">거래 내역이 없습니다.</p>
        ) : (
          <>
            {/* 모바일: 카드 리스트 */}
            <div className="space-y-2 lg:hidden">
              {trades.map((trade) => (
                <div key={trade.id} className="rounded-xl p-3 shadow-[var(--sh-card)] border border-border" style={{ background: 'var(--card)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {trade.direction === 'BUY' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: 'var(--pos-bg)', color: 'var(--pos)' }}>
                          매수
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: 'var(--neg-bg)', color: 'var(--neg)' }}>
                          매도
                        </span>
                      )}
                      <span className="font-medium text-sm">{trade.ticker}</span>
                    </div>
                    <span className="text-sm font-semibold">${(trade.price * trade.quantity).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>
                      {trade.quantity}주 × ${trade.price.toFixed(2)}
                    </span>
                    <span>{new Date(trade.tradeDate).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 데스크탑: 테이블 */}
            <div className="hidden lg:block rounded-[var(--r-lg)] border border-border overflow-hidden shadow-[var(--sh-card)]" style={{ background: 'var(--card)' }}>
              <table className="w-full text-sm">
                <thead style={{ background: 'var(--muted)' }}>
                  <tr>
                    {['구분', '종목', '수량', '단가', '금액', '체결일'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] uppercase tracking-widest text-rose-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => (
                    <tr key={trade.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        {trade.direction === 'BUY' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: 'var(--pos-bg)', color: 'var(--pos)' }}>
                            매수
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: 'var(--neg-bg)', color: 'var(--neg)' }}>
                            매도
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold">{trade.ticker}</td>
                      <td className="px-4 py-3 tabular-nums">{trade.quantity}주</td>
                      <td className="px-4 py-3 tabular-nums">${trade.price.toFixed(2)}</td>
                      <td className="px-4 py-3 font-bold tabular-nums">${(trade.price * trade.quantity).toFixed(2)}</td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">{new Date(trade.tradeDate).toLocaleDateString('ko-KR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
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
