import { fmtUsd } from '@shared/lib/format'
import { StrategyFieldLabel } from '../StrategyFieldLabel'

interface Props {
  initialUsdDeposit?: number
  hint?: string
}

export function ReadOnlySeedSection({ initialUsdDeposit, hint = '예수금은 전략 등록 후 수정할 수 없습니다' }: Props) {
  return (
    <div className="py-[18px] border-b border-border">
      <StrategyFieldLabel hint={hint}>
        예수금
      </StrategyFieldLabel>

      <div className="rounded-[var(--r-sm)] border border-border bg-card px-[14px] py-3">
        <div className="text-sm text-muted-foreground">시작 예수금</div>
        <div className="text-base font-bold text-foreground mt-1">
          {initialUsdDeposit != null ? `$${fmtUsd(initialUsdDeposit)}` : '미설정'}
        </div>
      </div>
    </div>
  )
}
