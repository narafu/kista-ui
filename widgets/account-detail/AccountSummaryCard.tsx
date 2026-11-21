'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard } from '@widgets/kpi-card'
import { fmtMoneyOrDash, fmtUsd } from '@shared/lib/format'
import { isMockBroker } from '@shared/lib/api-schema'
import { Badge } from '@shared/ui/Badge'
import { RevealableValue } from '@widgets/revealable-value'
import { useMeta } from '@entities/meta'
import { apiKeyExpiryState, API_KEY_EXPIRY_LABEL } from '@entities/account'
import type { Account, AccountLedgerTotals } from '@entities/account'

// 모든 타일을 같은 글씨 크기로 — 모바일 2열 타일 폭(360px에서 약 100px)에 금액이 들어가게 하고, 더 길면 타일 밖으로 넘치지 않게 줄바꿈한다
const TILE_VALUE = 'text-base sm:text-xl lg:text-2xl tabular-nums break-keep [overflow-wrap:anywhere]'

interface Props {
  account: Account
  deposit: number
  posEvalUsd: number
  ledgerTotals?: AccountLedgerTotals
  ledgerTotalsError?: boolean
}

export function AccountSummaryCard({ account, deposit, posEvalUsd, ledgerTotals, ledgerTotalsError }: Props) {
  const { labelOf } = useMeta()
  const brokerLabel = labelOf('brokers', account.broker)
  const isMock = isMockBroker(account.broker)
  const expiry = apiKeyExpiryState(account.apiKeyExpiresAt)
  // 조회 중·실패(undefined)와 서버가 null로 준 값(조회 실패)은 모두 "-"(fmtMoneyOrDash)
  // 통화는 서버 필드 우선, 없으면(로딩·실패) USD
  const ledgerCurrency = ledgerTotals?.currency ?? 'USD'
  const ledgerMoney = (v: number | null | undefined) =>
    fmtMoneyOrDash(ledgerTotals ? v : null, ledgerCurrency)
  const ledgerDeposit = ledgerMoney(ledgerTotals?.deposit)
  const ledgerEval = ledgerMoney(ledgerTotals?.evaluation)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle role="heading" aria-level={2} className="flex items-center gap-2 text-base lg:text-lg">
          계좌 요약
          {expiry && <Badge tone={expiry === 'EXPIRED' ? 'error' : 'warn'} size="sm">{API_KEY_EXPIRY_LABEL[expiry]}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-6 sm:px-6">
        <div className="grid grid-cols-2 gap-3 [&>div]:p-3 sm:[&>div]:p-5">
          {account.accountNoMasked != null && (
            <KpiCard
              label="계좌번호"
              value={
                <RevealableValue
                  value={account.accountNo ?? account.accountNoMasked}
                  hiddenDisplay={account.accountNoMasked}
                  className="whitespace-nowrap"
                />
              }
              valueClassName={TILE_VALUE}
            />
          )}
          <KpiCard label="증권사" className={account.accountNoMasked == null ? 'col-span-2' : undefined} value={brokerLabel} valueClassName={TILE_VALUE} />
          <p className="col-span-2 mt-1 text-xs font-medium text-muted-foreground">전략 기준</p>
          <KpiCard label="예수금" value={ledgerDeposit} valueClassName={TILE_VALUE} />
          <KpiCard label="평가금" value={ledgerEval} valueClassName={TILE_VALUE} />
          {ledgerTotalsError && (
            <p role="status" className="col-span-2 text-xs text-muted-foreground">전략 기준 금액을 불러오지 못했습니다.</p>
          )}
          {!isMock && (
            <>
              <p className="col-span-2 mt-1 text-xs font-medium text-muted-foreground">증권사 기준</p>
              <KpiCard label="예수금" value={`$${fmtUsd(deposit)}`} valueClassName={TILE_VALUE} />
              <KpiCard label="평가금" value={`$${fmtUsd(posEvalUsd)}`} valueClassName={TILE_VALUE} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
