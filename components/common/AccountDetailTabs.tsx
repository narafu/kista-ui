'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StrategyBadge } from './StrategyBadge'
import { TradingStatusIndicator } from './TradingStatusIndicator'
import { ProfitDisplay } from './ProfitDisplay'
import type { Account } from '@/types/account'
import type { TradeHistory, PortfolioSnapshot } from '@/types/trade'

type Tab = 'summary' | 'trades' | 'statistics'

interface Props {
  account: Account
  trades: TradeHistory[]
  portfolio: PortfolioSnapshot
}

export function AccountDetailTabs({ account, trades, portfolio }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('summary')

  return (
    <div className="space-y-4">
      {/* 모바일 탭 헤더 */}
      <div className="flex lg:hidden gap-1 border-b">
        {(['summary', 'trades', 'statistics'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            {tab === 'summary' ? '요약' : tab === 'trades' ? '거래 내역' : '통계'}
          </button>
        ))}
      </div>

      {/* 모바일: 탭 콘텐츠 */}
      <div className="lg:hidden">
        {activeTab === 'summary' && (
          <SummaryTab account={account} portfolio={portfolio} />
        )}
        {activeTab === 'trades' && <TradesTab trades={trades} />}
        {activeTab === 'statistics' && <StatisticsPlaceholder />}
      </div>

      {/* 데스크탑: 전체 레이아웃 */}
      <div className="hidden lg:block space-y-6">
        <div className="grid grid-cols-5 gap-6">
          <div className="col-span-3">
            <StatisticsPlaceholder />
          </div>
          <div className="col-span-2">
            <SummaryTab account={account} portfolio={portfolio} />
          </div>
        </div>
        <TradesTab trades={trades} />
      </div>
    </div>
  )
}

function SummaryTab({ account, portfolio }: { account: Account; portfolio: PortfolioSnapshot }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{account.nickname}</CardTitle>
            <TradingStatusIndicator status={account.strategyStatus} />
          </div>
          <StrategyBadge strategy={account.strategy} />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">계좌번호</span>
            <span className="font-medium">{account.accountNo}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">보유 수량</span>
            <span className="font-medium">{portfolio.quantity}주</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">평균 단가</span>
            <span className="font-medium">${portfolio.avgPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">현재가</span>
            <span className="font-medium">${portfolio.currentPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">평가 손익</span>
            <ProfitDisplay amount={portfolio.profitLoss} rate={portfolio.profitLossRate} />
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 h-10">
          {account.strategyStatus === 'ACTIVE' ? '전략 중지' : '전략 재개'}
        </Button>
        <Button variant="outline" size="sm" className="h-10 px-4 text-destructive hover:text-destructive">
          계좌 삭제
        </Button>
      </div>
    </div>
  )
}

function TradesTab({ trades }: { trades: TradeHistory[] }) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-muted-foreground hidden lg:block">거래 내역</h3>
      {/* 모바일: 카드 리스트 */}
      <div className="space-y-2 lg:hidden">
        {trades.map((trade) => (
          <Card key={trade.id} className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={trade.side === 'BUY' ? 'default' : 'secondary'}>
                  {trade.side === 'BUY' ? '매수' : '매도'}
                </Badge>
                <span className="font-medium text-sm">{trade.symbol}</span>
              </div>
              <span className="text-sm font-semibold">${trade.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{trade.quantity}주 × ${trade.price.toFixed(2)}</span>
              <span>{new Date(trade.executedAt).toLocaleDateString('ko-KR')}</span>
            </div>
          </Card>
        ))}
      </div>
      {/* 데스크탑: 테이블 */}
      <div className="hidden lg:block rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['구분', '종목', '수량', '단가', '금액', '체결일'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className="border-t hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <Badge variant={trade.side === 'BUY' ? 'default' : 'secondary'} className="text-xs">
                    {trade.side === 'BUY' ? '매수' : '매도'}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-medium">{trade.symbol}</td>
                <td className="px-4 py-3">{trade.quantity}주</td>
                <td className="px-4 py-3">${trade.price.toFixed(2)}</td>
                <td className="px-4 py-3 font-medium">${trade.amount.toFixed(2)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(trade.executedAt).toLocaleDateString('ko-KR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatisticsPlaceholder() {
  return (
    <Card className="min-h-[240px] flex items-center justify-center">
      <div className="text-center text-muted-foreground space-y-2">
        <p className="text-sm">수익/손실 차트</p>
        <p className="text-xs">Phase 4에서 KIS API 연동 후 구현</p>
      </div>
    </Card>
  )
}
