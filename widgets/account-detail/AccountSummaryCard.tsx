'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard } from '@widgets/kpi-card'
import { fmtMoney, fmtUsd } from '@shared/lib/format'
import { brokerKindLabel, isCryptoBroker, isMockBroker } from '@shared/lib/api-schema'
import type { Currency } from '@shared/lib/api-schema'
import { Badge } from '@shared/ui/Badge'
import { RevealableValue } from '@widgets/revealable-value'
import { useMeta } from '@entities/meta'
import { apiKeyExpiryState, API_KEY_EXPIRY_LABEL } from '@entities/account'
import type { Account, AccountLedgerTotals } from '@entities/account'
import type { CryptoPortfolio } from '@entities/trade'

// 모든 타일을 같은 글씨 크기로 — 모바일 2열 타일 폭(360px에서 약 100px)에서 숫자가 중간에 끊기지 않게 한다
const TILE_VALUE = 'text-lg sm:text-xl lg:text-2xl tabular-nums break-keep'
// 금액 타일은 모바일에서 전체 폭을 줘 긴 금액이 한 줄에 들어가게 한다
const MONEY_TILE = 'col-span-2 sm:col-span-1'
// 코드형 단위(USDT)는 값 뒤에 붙이면 모바일 타일에서 줄바꿈되므로 라벨 줄 오른쪽에 둔다. 기호형 단위(원·$)는 값에 그대로 붙인다
// DcaStrategyDetail의 unitTag·moneyTile과 중복되는 헬퍼
const unitTag = (unit: string) => <span className="ml-2 shrink-0 whitespace-nowrap text-sm font-medium text-muted-foreground">{unit}</span>
function moneyTile(currency: Currency) {
  return currency === 'USDT'
    ? { fmt: (n: number) => fmtUsd(n), labelAction: unitTag('USDT') }
    : { fmt: (n: number) => fmtMoney(n, currency), labelAction: undefined }
}

// 조회 실패·로딩 중 금액 자리
const NO_VALUE = '-'

interface Props {
  account: Account
  deposit: number
  posEvalUsd: number
  ledgerTotals?: AccountLedgerTotals
  ledgerTotalsError?: boolean
  cryptoPortfolio?: CryptoPortfolio
}

export function AccountSummaryCard({ account, deposit, posEvalUsd, ledgerTotals, ledgerTotalsError, cryptoPortfolio }: Props) {
  const { labelOf } = useMeta()
  const brokerLabel = labelOf('brokers', account.broker)
  const isMock = isMockBroker(account.broker)
  const expiry = apiKeyExpiryState(account.apiKeyExpiresAt)
  // 조회 중·실패(undefined)와 서버가 null로 준 값(조회 실패·MOCK 미배정)은 모두 NO_VALUE
  const ledger = moneyTile(ledgerTotals?.currency ?? 'KRW')
  const ledgerMoney = (v: number | null | undefined) => (ledgerTotals && v != null ? ledger.fmt(v) : NO_VALUE)
  const crypto = moneyTile(cryptoPortfolio?.currency ?? 'USDT')
  // 현재가를 못 받은 종목은 평가금액이 0으로 들어와 총자산에서 빠진다
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
                  className="whitespace-nowrap"
                />
              }
              valueClassName={TILE_VALUE}
            />
          )}
          <KpiCard label={brokerKindLabel(account.broker)} className={account.accountNoMasked == null ? 'col-span-2' : undefined} value={brokerLabel} valueClassName={TILE_VALUE} />
          <KpiCard label="예수금 (전략 합산)" className={MONEY_TILE} labelAction={ledger.labelAction} value={ledgerMoney(ledgerTotals?.deposit)} valueClassName={TILE_VALUE} />
          <KpiCard label="평가금 (전략 합산)" className={MONEY_TILE} labelAction={ledger.labelAction} value={ledgerMoney(ledgerTotals?.evaluation)} valueClassName={TILE_VALUE} />
          <KpiCard label="미배정 예수금 (주문 가능 기준)" className="col-span-2" labelAction={ledger.labelAction} value={ledgerMoney(ledgerTotals?.unassignedCash)} valueClassName={TILE_VALUE} />
          {ledgerTotalsError && (
            <p role="status" className="col-span-2 text-xs text-muted-foreground">전략 합산 금액을 불러오지 못했습니다.</p>
          )}
          {isCryptoBroker(account.broker) ? (
            <>
              <p className="col-span-2 mt-1 text-xs font-medium text-muted-foreground">거래소 기준</p>
              <KpiCard label="예수금" className={MONEY_TILE} labelAction={crypto.labelAction} value={cryptoPortfolio ? crypto.fmt(cryptoPortfolio.cash) : '-'} valueClassName={TILE_VALUE} />
              <div className="col-span-2">
                <KpiCard label="총자산" labelAction={crypto.labelAction} value={cryptoPortfolio ? crypto.fmt(cryptoPortfolio.totalAsset) : '-'} valueClassName={TILE_VALUE} />
                {hasUnpricedHolding && (
                  <p className="mt-1 text-xs text-muted-foreground">일부 종목은 현재가 확인 불가로 총자산에서 빠졌습니다.</p>
                )}
              </div>
            </>
          ) : !isMock && (
            <>
              <p className="col-span-2 mt-1 text-xs font-medium text-muted-foreground">증권사 기준</p>
              <KpiCard label="예수금" className={MONEY_TILE} value={`$${fmtUsd(deposit)}`} valueClassName={TILE_VALUE} />
              <KpiCard label="평가금" className={MONEY_TILE} value={`$${fmtUsd(posEvalUsd)}`} valueClassName={TILE_VALUE} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
