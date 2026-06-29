'use client'

import { fmtUsd } from '@shared/lib/format'
import { StrategyFieldLabel } from '../StrategyFieldLabel'

interface Props {
  initialUsdDeposit?: number
}

export function ReadOnlySeedSection({ initialUsdDeposit }: Props) {
  return (
    <div className="py-[18px] border-b border-border">
      <StrategyFieldLabel hint="시드는 전략 등록 후 수정할 수 없습니다">
        시작금액
      </StrategyFieldLabel>

      <div className="rounded-[var(--r-sm)] border border-border bg-card px-[14px] py-3">
        <div className="text-sm text-muted-foreground">현재 시작금액</div>
        <div className="text-base font-bold text-foreground mt-1">
          {initialUsdDeposit != null ? `$${fmtUsd(initialUsdDeposit)}` : '미설정'}
        </div>
      </div>
    </div>
  )
}
