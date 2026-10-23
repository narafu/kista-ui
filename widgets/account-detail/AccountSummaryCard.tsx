'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard } from '@widgets/kpi-card'
import { fmtMoney, fmtUsd } from '@shared/lib/format'
import { isCryptoBroker, isMockBroker } from '@shared/lib/api-schema'
import { Badge } from '@shared/ui/Badge'
import { RevealableValue } from '@widgets/revealable-value'
import { useMeta } from '@entities/meta'
import { apiKeyExpiryState, API_KEY_EXPIRY_LABEL } from '@entities/account'
import type { Account } from '@entities/account'
import type { CryptoPortfolio } from '@entities/trade'

// 통화 단위(원·USDT)가 홀로 줄바꿈되지 않게 붙이되, 아주 긴 숫자는 넘치지 않고 줄바꿈한다
const LONG_MONEY_CLASS = 'break-keep [overflow-wrap:anywhere]'

interface Props {
  account: Account
  usdDeposit: number
  posEvalUsd: number
  cryptoPortfolio?: CryptoPortfolio
}

export function AccountSummaryCard({ account, usdDeposit, posEvalUsd, cryptoPortfolio }: Props) {
  const { labelOf } = useMeta()
  const brokerLabel = labelOf('brokers', account.broker)
  const isMock = isMockBroker(account.broker)
  const expiry = apiKeyExpiryState(account.apiKeyExpiresAt)
  // 현재가를 못 받은 코인은 평가금액이 0으로 들어와 총자산에서 빠진다
  const hasUnpricedHolding = cryptoPortfolio?.holdings.some((h) => h.currentPrice == null) ?? false

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle role="heading" aria-level={2} className="flex items-center gap-2 text-base lg:text-lg">
          계좌 요약
          {expiry && <Badge tone={expiry === 'EXPIRED' ? 'error' : 'warn'} size="sm">{API_KEY_EXPIRY_LABEL[expiry]}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="grid grid-cols-2 gap-3">
          {account.accountNoMasked != null && (
            <KpiCard
              label="계좌번호"
              value={
                <RevealableValue
                  value={account.accountNo ?? account.accountNoMasked}
                  hiddenDisplay={account.accountNoMasked}
                  className="text-lg lg:text-xl whitespace-nowrap"
                />
              }
            />
          )}
          <KpiCard label="증권사" className={isCryptoBroker(account.broker) ? 'col-span-2 sm:col-span-1' : undefined} value={<span className="text-xl font-semibold leading-snug">{brokerLabel}</span>} />
          {isCryptoBroker(account.broker) ? (
            <>
              <KpiCard label="예수금" className="col-span-2 sm:col-span-1" value={cryptoPortfolio ? fmtMoney(cryptoPortfolio.cash, cryptoPortfolio.currency) : '-'} valueClassName={LONG_MONEY_CLASS} />
              <div className="col-span-2">
                <KpiCard label="총자산" value={cryptoPortfolio ? fmtMoney(cryptoPortfolio.totalAsset, cryptoPortfolio.currency) : '-'} valueClassName={LONG_MONEY_CLASS} />
                {hasUnpricedHolding && (
                  <p className="mt-1 text-xs text-muted-foreground">일부 코인은 현재가 확인 불가로 총자산에서 빠졌습니다.</p>
                )}
              </div>
            </>
          ) : !isMock && (
            <>
              <KpiCard label="예수금(실계좌기준)" value={`$${fmtUsd(usdDeposit)}`} />
              <KpiCard label="평가금(실계좌기준)" value={`$${fmtUsd(posEvalUsd)}`} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
