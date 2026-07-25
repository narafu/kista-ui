'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard } from '@widgets/kpi-card'
import { fmtUsd } from '@shared/lib/format'
import { useMeta } from '@entities/meta'
import type { Account } from '@entities/account'

interface Props {
  account: Account
  usdDeposit: number
  posEvalUsd: number
}

export function AccountSummaryCard({ account, usdDeposit, posEvalUsd }: Props) {
  const [revealed, setRevealed] = useState(false)
  const { labelOf } = useMeta()
  const brokerLabel = labelOf('brokers', account.broker)
  const isMock = account.broker === 'MOCK'

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">계좌 요약</CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            label="계좌번호"
            labelAction={
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                aria-label={revealed ? '숨기기' : '보기'}
              >
                {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            }
            value={
              <span className="font-mono tracking-wide text-lg lg:text-xl whitespace-nowrap">
                {revealed ? (account.accountNo ?? account.accountNoMasked) : account.accountNoMasked}
              </span>
            }
          />
          <KpiCard label="증권사" value={<span className="text-xl font-semibold leading-snug">{brokerLabel}</span>} />
          {!isMock && (
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
