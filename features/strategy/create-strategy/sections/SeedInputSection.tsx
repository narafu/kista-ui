'use client'

import { Badge } from '@shared/ui/Badge'
import { Button } from '@/components/ui/button'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import { SeedAmountInput } from './SeedAmountInput'
import { fmtUsd } from '@shared/lib/format'

const FILL_PERCENTS = [25, 50, 75, 100]

interface Props {
  hint?: string
  seedUsdInput: number | null
  setSeedUsdInput: (v: number | null) => void
  // 가용 예수금 — 참고값·비율 채우기용, 시드 검증에는 쓰지 않는다 (모의계좌·조회 실패는 null)
  availableCash: number | null
  minSeed: number | null
  isBelowMinSeed: boolean
  loading: boolean
  mockBadgeLabel?: string
}

// 호출부 힌트(수정 모드 안내 등)가 있어도 가용 예수금은 함께 보여야 비율 버튼의 기준을 알 수 있다
function seedHint(hint: string | undefined, availableCash: number | null, mockBadgeLabel?: string) {
  if (availableCash !== null) {
    const cash = `가용 예수금 $${fmtUsd(availableCash)}`
    return hint ? `${hint} · ${cash}` : cash
  }
  if (hint) return hint
  if (mockBadgeLabel) return <Badge tone="brand" size="md">{mockBadgeLabel}</Badge>
  return undefined
}

export function SeedInputSection({
  hint,
  seedUsdInput, setSeedUsdInput,
  availableCash, minSeed, isBelowMinSeed, loading,
  mockBadgeLabel,
}: Props) {
  return (
    <div className="py-[18px] border-b border-border">
      <StrategyFieldLabel
        hint={seedHint(hint, availableCash, mockBadgeLabel)}
      >
        예수금
      </StrategyFieldLabel>

      <SeedAmountInput
        value={seedUsdInput}
        onChange={setSeedUsdInput}
        deposit={availableCash}
        minSeed={minSeed}
        belowMinSeed={isBelowMinSeed}
        disabled={loading}
      />

      {availableCash !== null && availableCash > 0 && (
        <div className="flex gap-2 mt-3">
          {FILL_PERCENTS.map((p) => (
            <Button
              key={p}
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              // 100%는 내림(예수금 초과 방지), 그 외는 올림(시드 부족 방지)
              onClick={() => setSeedUsdInput(p === 100 ? Math.floor(availableCash) : Math.ceil((availableCash * p) / 100))}
            >
              {p}%
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
