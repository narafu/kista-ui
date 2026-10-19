'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard } from '@widgets/kpi-card'
import { fmtKrw, fmtUsd } from '@shared/lib/format'
import { isCryptoBroker, isMockBroker } from '@shared/lib/api-schema'
import { Badge } from '@shared/ui/Badge'
import { IconButton } from '@shared/ui/IconButton'
import { useMeta } from '@entities/meta'
import { apiKeyExpiryState, API_KEY_EXPIRY_LABEL } from '@entities/account'
import type { Account } from '@entities/account'
import type { CryptoPortfolio } from '@entities/trade'

// 금액은 "원"이 홀로 줄바꿈되지 않게 붙이되, 아주 긴 숫자는 넘치지 않고 줄바꿈한다
const KRW_VALUE_CLASS = 'break-keep [overflow-wrap:anywhere]'

interface Props {
  account: Account
  usdDeposit: number
  posEvalUsd: number
  cryptoPortfolio?: CryptoPortfolio
}

export function AccountSummaryCard({ account, usdDeposit, posEvalUsd, cryptoPortfolio }: Props) {
  const [revealed, setRevealed] = useState(false)
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
              labelAction={
                <IconButton
                  onClick={() => setRevealed((v) => !v)}
                  className="-m-3.5 shrink-0 hover:bg-transparent"
                  aria-label={revealed ? '숨기기' : '보기'}
                >
                  {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </IconButton>
              }
              value={
                <span className="font-mono tracking-wide text-lg lg:text-xl whitespace-nowrap">
                  {revealed ? (account.accountNo ?? account.accountNoMasked) : account.accountNoMasked}
                </span>
              }
            />
          )}
          <KpiCard label="증권사" className={isCryptoBroker(account.broker) ? 'col-span-2 sm:col-span-1' : undefined} value={<span className="text-xl font-semibold leading-snug">{brokerLabel}</span>} />
          {isCryptoBroker(account.broker) ? (
            <>
              <KpiCard label="원화 예수금" className="col-span-2 sm:col-span-1" value={cryptoPortfolio ? fmtKrw(cryptoPortfolio.krwCash) : '-'} valueClassName={KRW_VALUE_CLASS} />
              <div className="col-span-2">
                <KpiCard label="총자산" value={cryptoPortfolio ? fmtKrw(cryptoPortfolio.totalAssetKrw) : '-'} valueClassName={KRW_VALUE_CLASS} />
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
