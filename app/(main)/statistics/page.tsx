import { getAuthToken } from '@/lib/auth/token'
import { listAccounts } from '@/lib/api/accounts'
import { getCurrentPortfolio, getTrades } from '@/lib/api/trades'
import { ProfitStatsCard } from '@/components/common/ProfitStatsCard'
import type { Account } from '@/types/account'
import type { TradeHistory, PortfolioSnapshot } from '@/types/trade'

export default async function StatisticsPage() {
  const token = await getAuthToken()

  let accounts: Account[] = []
  let portfolio: PortfolioSnapshot | null = null
  let trades: TradeHistory[] = []

  if (token) {
    ;[accounts, portfolio, trades] = await Promise.all([
      listAccounts(token).catch((): Account[] => []),
      getCurrentPortfolio(token).catch(() => null),
      getTrades({}, token).catch((): TradeHistory[] => []),
    ])
  }

  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--rose-500)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Statistics</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>통계</h1>
      </div>

      {/* 포트폴리오 현황 */}
      {portfolio && (
        <div style={{ background: 'var(--card)', borderRadius: 14, padding: 22, boxShadow: 'var(--sh-card)', border: '1px solid var(--border)', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>포트폴리오 현황</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', marginTop: 2 }}>최근 종가 기준</div>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: 'var(--rose-50)', color: 'var(--rose-600)' }}>
              {portfolio.symbol}
            </span>
          </div>
          <div style={{ gap: 18 }} className="sm:portfolio-grid">
            {[
              { label: '종목',       value: portfolio.symbol,                                  tone: null },
              { label: '보유 수량',  value: `${portfolio.qty}주`,                              tone: null },
              { label: '평균 단가',  value: `$${portfolio.avgPrice.toFixed(2)}`,               tone: null },
              { label: '현재가',     value: `$${portfolio.currentPrice.toFixed(2)}`,           tone: 'pos' },
              { label: '평가금액',   value: `$${portfolio.marketValueUsd.toFixed(2)}`,         tone: null },
              { label: 'USD 예수금', value: `$${portfolio.usdDeposit.toFixed(2)}`,             tone: null },
              { label: '총 자산',    value: `$${portfolio.totalAssetUsd.toFixed(2)}`,          tone: 'accent' },
            ].map(({ label, value, tone }) => (
              <div key={label}>
                <div style={{ fontSize: 11.5, color: 'var(--muted-foreground)', marginBottom: 6 }}>{label}</div>
                <div style={{
                  fontSize: tone === 'accent' ? 19 : 16,
                  fontWeight: tone === 'accent' ? 800 : 700,
                  fontVariantNumeric: 'tabular-nums',
                  color: tone === 'accent' ? 'var(--primary)' : tone === 'pos' ? 'var(--pos)' : 'var(--foreground)',
                }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 전체 거래 이력 */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>전체 거래 이력</h2>
          <a
            href="/api/trades/export"
            style={{ display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, border: '1px solid var(--border)', color: 'var(--foreground)', background: 'var(--card)', textDecoration: 'none', cursor: 'pointer' }}
          >
            CSV 내보내기
          </a>
        </div>
        {trades.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)', padding: '16px 0' }}>거래 내역이 없습니다.</p>
        ) : (
          <>
            {/* 모바일: 카드 리스트 */}
            <div className="space-y-2 lg:hidden">
              {trades.map((trade) => (
                <div key={trade.id} style={{ background: 'var(--card)', borderRadius: 12, padding: 12, boxShadow: 'var(--sh-card)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {trade.direction === 'BUY' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'var(--pos-bg)', color: 'var(--pos)' }}>매수</span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'var(--neg-bg)', color: 'var(--neg)' }}>매도</span>
                      )}
                      <span className="font-medium text-sm">{trade.symbol}</span>
                    </div>
                    <span className="text-sm font-semibold">${trade.amountUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>{trade.qty}주 × ${trade.price.toFixed(2)}</span>
                    <span>{new Date(trade.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 데스크탑: 테이블 */}
            <div className="hidden lg:block" style={{ background: 'var(--card)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--sh-card)' }}>
              <table className="w-full text-sm">
                <thead style={{ background: 'var(--muted)' }}>
                  <tr>
                    {['구분', '종목', '전략', '수량', '단가', '금액', '체결일'].map((h) => (
                      <th key={h} style={{ color: 'var(--muted-foreground)', fontSize: 12, fontWeight: 600 }} className="px-4 py-3 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => (
                    <tr key={trade.id} style={{ borderTop: '1px solid var(--border)' }} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        {trade.direction === 'BUY' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'var(--pos-bg)', color: 'var(--pos)' }}>매수</span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'var(--neg-bg)', color: 'var(--neg)' }}>매도</span>
                        )}
                      </td>
                      <td className="px-4 py-3" style={{ fontWeight: 700 }}>{trade.symbol}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)', fontSize: 12 }}>{trade.strategy}</td>
                      <td className="px-4 py-3" style={{ fontVariantNumeric: 'tabular-nums' }}>{trade.qty}주</td>
                      <td className="px-4 py-3" style={{ fontVariantNumeric: 'tabular-nums' }}>${trade.price.toFixed(2)}</td>
                      <td className="px-4 py-3" style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>${trade.amountUsd.toFixed(2)}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>
                        {new Date(trade.createdAt).toLocaleDateString('ko-KR')}
                      </td>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0', color: 'var(--muted-foreground)' }}>
          <p style={{ fontSize: 13 }}>등록된 계좌가 없습니다.</p>
        </div>
      ) : (
        <div>
          <h2 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 700 }}>계좌별 손익 통계</h2>
          <div style={{ gap: 18 }} className="md:profit-grid">
            {accounts.map((account) => (
              <div key={account.id} style={{ background: 'var(--card)', borderRadius: 14, padding: 20, boxShadow: 'var(--sh-card)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{account.nickname}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 600, background: 'var(--rose-50)', color: 'var(--rose-600)' }}>
                    {account.strategy}
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
