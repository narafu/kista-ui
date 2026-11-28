import { fmtUsd } from '@shared/lib/format'
import { floorToCents } from '@entities/strategy'
import { StrategyFieldLabel } from '../StrategyFieldLabel'

interface Props {
  type: string
  initialDeposit?: number
  ledgerDeposit?: number
}

export function ReadOnlySeedSection({ type, initialDeposit, ledgerDeposit }: Props) {
  // DCA의 initialDeposit은 보유 원가를 포함한 사이클 시작금액이라 예수금이 아니다 — 장부 예수금을 보인다
  const isDca = type === 'DCA'
  // 장부 예수금은 상세·인출 폼과 같이 센트 미만을 절사한다
  const amount = isDca ? (ledgerDeposit == null ? undefined : floorToCents(ledgerDeposit)) : initialDeposit
  return (
    <div className="py-[18px] border-b border-border">
      {/* 이 화면에서 못 고칠 뿐 투자금 추가·인출로 바꾼다 — VR은 수정 화면이 없다 */}
      <StrategyFieldLabel hint="예수금은 투자금 추가·인출로 바꿉니다">
        예수금
      </StrategyFieldLabel>

      <div className="rounded-sm border border-border bg-card px-[14px] py-3">
        <div className="text-sm text-muted-foreground">{isDca ? '현재 장부 예수금' : '시작 예수금'}</div>
        <div className="text-base font-bold text-foreground mt-1">
          {amount != null ? `$${fmtUsd(amount)}` : '미설정'}
        </div>
      </div>
    </div>
  )
}
