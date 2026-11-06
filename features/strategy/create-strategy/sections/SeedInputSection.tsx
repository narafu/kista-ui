'use client'

import { Badge } from '@shared/ui/Badge'
import { Button } from '@/components/ui/button'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import { SeedAmountInput } from './SeedAmountInput'
import { fmtMoney } from '@shared/lib/format'
import { CURRENCY_SCALE, type Currency } from '@shared/lib/api-schema'

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
  currency?: Currency // 계좌 통화 — DCA 코인 계좌는 KRW·USDT, 그 외는 USD
}

// 채우기 금액 자릿수 — USD는 기존대로 달러 단위, USDT는 가용액이 1 미만일 수 있어 통화 자릿수(센트)까지
// (toFixed(6)은 x*100의 부동소수 오차 제거용)
function fillAmount(availableCash: number, percent: number, currency: Currency) {
  const f = 10 ** (currency === 'USD' ? 0 : CURRENCY_SCALE[currency])
  const scaled = Number(((availableCash * percent) / 100 * f).toFixed(6))
  return (percent === 100 ? Math.floor(scaled) : Math.ceil(scaled)) / f
}

// 호출부 힌트(수정 모드 안내 등)가 있어도 가용 예수금은 함께 보여야 비율 버튼의 기준을 알 수 있다
function seedHint(hint: string | undefined, availableCash: number | null, currency: Currency, mockBadgeLabel?: string) {
  if (availableCash !== null) {
    const cash = `가용 예수금 ${fmtMoney(availableCash, currency)}`
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
  mockBadgeLabel, currency = 'USD',
}: Props) {
  return (
    <div className="py-[18px] border-b border-border">
      <StrategyFieldLabel
        hint={seedHint(hint, availableCash, currency, mockBadgeLabel)}
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
        currency={currency}
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
              onClick={() => setSeedUsdInput(fillAmount(availableCash, p, currency))}
            >
              {p}%
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
