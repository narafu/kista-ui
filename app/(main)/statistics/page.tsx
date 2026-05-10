import { createClient } from '@/lib/supabase/server'
import { listAccounts } from '@/lib/api/accounts'
import { getCurrentPortfolio, getTrades } from '@/lib/api/trades'
import { ProfitStatsCard } from '@/components/common/ProfitStatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Account } from '@/types/account'
import type { TradeHistory, PortfolioSnapshot } from '@/types/trade'

export default async function StatisticsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

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
      <h1 className="text-2xl font-bold">통계</h1>

      {/* 포트폴리오 요약 */}
      {portfolio && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">포트폴리오 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">종목</p>
                <p className="font-semibold">{portfolio.symbol}</p>
              </div>
              <div>
                <p className="text-muted-foreground">보유 수량</p>
                <p className="font-semibold">{portfolio.qty}주</p>
              </div>
              <div>
                <p className="text-muted-foreground">평균 단가</p>
                <p className="font-semibold">${portfolio.avgPrice.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">현재가</p>
                <p className="font-semibold">${portfolio.currentPrice.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">평가금액(USD)</p>
                <p className="font-semibold">${portfolio.marketValueUsd.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">USD 예수금</p>
                <p className="font-semibold">${portfolio.usdDeposit.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">총 자산(USD)</p>
                <p className="font-semibold text-base">${portfolio.totalAssetUsd.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 전체 거래 이력 */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold">전체 거래 이력</h2>
        {trades.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">거래 내역이 없습니다.</p>
        ) : (
          <>
            {/* 모바일: 카드 리스트 */}
            <div className="space-y-2 lg:hidden">
              {trades.map((trade) => (
                <Card key={trade.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={trade.direction === 'BUY' ? 'default' : 'secondary'}>
                        {trade.direction === 'BUY' ? '매수' : '매도'}
                      </Badge>
                      <span className="font-medium text-sm">{trade.symbol}</span>
                    </div>
                    <span className="text-sm font-semibold">${trade.amountUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>{trade.qty}주 × ${trade.price.toFixed(2)}</span>
                    <span>{new Date(trade.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                </Card>
              ))}
            </div>
            {/* 데스크탑: 테이블 */}
            <div className="hidden lg:block rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {['구분', '종목', '전략', '수량', '단가', '금액', '체결일'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => (
                    <tr key={trade.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Badge variant={trade.direction === 'BUY' ? 'default' : 'secondary'} className="text-xs">
                          {trade.direction === 'BUY' ? '매수' : '매도'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium">{trade.symbol}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{trade.strategy}</td>
                      <td className="px-4 py-3">{trade.qty}주</td>
                      <td className="px-4 py-3">${trade.price.toFixed(2)}</td>
                      <td className="px-4 py-3 font-medium">${trade.amountUsd.toFixed(2)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
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
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <p className="text-sm">등록된 계좌가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {accounts.map((account) => (
            <div key={account.id} className="space-y-2">
              <h2 className="text-base font-semibold text-muted-foreground">{account.nickname}</h2>
              <ProfitStatsCard accountId={account.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
