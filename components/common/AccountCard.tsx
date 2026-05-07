import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StrategyBadge } from './StrategyBadge'
import { TradingStatusIndicator } from './TradingStatusIndicator'
import { ProfitDisplay } from './ProfitDisplay'
import type { Account } from '@/types/account'

interface Props {
  account: Account
  profitLoss?: number
  profitLossRate?: number
}

export function AccountCard({ account, profitLoss = 0, profitLossRate = 0 }: Props) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{account.nickname}</CardTitle>
          <TradingStatusIndicator status={account.strategyStatus} />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <StrategyBadge strategy={account.strategy} />
          <span className="text-xs text-muted-foreground">{account.accountNoMasked}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">평가 손익</span>
          <ProfitDisplay amount={profitLoss} rate={profitLossRate} />
        </div>
      </CardContent>
    </Card>
  )
}
