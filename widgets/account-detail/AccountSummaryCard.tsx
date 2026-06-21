'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard } from '@widgets/kpi-card'
import { RevealableValue } from '@widgets/revealable-value'
import { fmtUsd, fmtPercent } from '@shared/lib/format'
import { useMeta } from '@entities/meta'
import type { Account } from '@entities/account'
import type { PortfolioSnapshot } from '@entities/trade'

interface Props {
  account: Account
  portfolio: PortfolioSnapshot | null
  usdDeposit: number
}

export function AccountSummaryCard({ account, portfolio, usdDeposit }: Props) {
  const { labelOf } = useMeta()
  const brokerLabel = labelOf('brokers', account.broker)
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
          <KpiCard
            label="계좌번호"
            value={
              <RevealableValue
                value={account.accountNo ?? account.accountNoMasked}
                hiddenDisplay={account.accountNoMasked}
              />
            }
          />
          <KpiCard label="증권사" value={<span className="text-base font-semibold leading-snug">{brokerLabel}</span>} />
          <KpiCard label="예수금" value={`$${fmtUsd(usdDeposit ?? 0)}`} />
          <KpiCard
            label="평가손익"
            value={
              portfolio ? (
                <span style={{ color: unrealized >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
                  {unrealized >= 0 ? '+' : ''}${fmtUsd(unrealized)} ({fmtPercent(rate)})
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
