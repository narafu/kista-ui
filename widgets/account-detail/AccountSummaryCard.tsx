'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard } from '@/components/common/KpiCard'
import type { Account } from '@entities/account'
import type { PortfolioSnapshot } from '@entities/trade'

interface Props {
  account: Account
  portfolio: PortfolioSnapshot | null
  usdDeposit: number
  hasStrategy: boolean
}

export function AccountSummaryCard({ account, portfolio, usdDeposit, hasStrategy }: Props) {
  const cost = portfolio ? (portfolio.avgPrice ?? 0) * (portfolio.holdings ?? 0) : 0
  const unrealized = portfolio ? (portfolio.marketValueUsd ?? 0) - cost : 0
  const rate = cost > 0 ? (unrealized / cost) * 100 : 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">계좌 요약</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="계좌번호" value={<span className="font-mono tracking-wider">{account.accountNoMasked}</span>} />
          <KpiCard label="증권사" value={account.broker} />
          <KpiCard label="예수금" value={`$${(usdDeposit ?? 0).toFixed(2)}`} />
          {hasStrategy && portfolio && (
            <>
              <KpiCard label="종목" value={portfolio.ticker} />
              <KpiCard label="현재가" value={`$${(portfolio.currentPrice ?? 0).toFixed(2)}`} />
              <KpiCard label="보유 수량" value={`${portfolio.holdings}주`} />
              <KpiCard label="평단가" value={`$${(portfolio.avgPrice ?? 0).toFixed(2)}`} />
              <KpiCard label="평가 금액" value={`$${(portfolio.marketValueUsd ?? 0).toFixed(2)}`} />
              <KpiCard
                label="평가 손익"
                variant="default"
                value={
                  <span style={{ color: unrealized >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                    {unrealized >= 0 ? '+' : ''}${unrealized.toFixed(2)} ({rate >= 0 ? '+' : ''}{rate.toFixed(2)}%)
                  </span>
                }
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
