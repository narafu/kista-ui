'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import { PercentGauge, SeedAmountInput } from '@widgets/percent-gauge'
import { fmtUsd } from '@shared/lib/format'

const BALANCE_OFF_BADGE = (
  <span
    className="text-xs font-bold px-2 py-0.5 rounded-full border"
    style={{ background: 'var(--rose-50, rgba(251,207,232,.15))', color: 'var(--rose-500)', borderColor: 'var(--rose-300)' }}
  >
    잔고검증 OFF
  </span>
)

interface Props {
  isEdit?: boolean
  pct: number
  setPct: (pct: number) => void
  seedUsdInput: number | null
  setSeedUsdInput: (v: number | null) => void
  usdDeposit: number | null
  minSeed: number | null
  loading: boolean
  loadingBase: boolean
  isBelowMinSeed: boolean
  seedUnavailableReason: string | null
  balanceCheckEnabled?: boolean
}

export function UsageRatioSection({
  isEdit = false,
  pct, setPct, seedUsdInput, setSeedUsdInput,
  usdDeposit, minSeed, loading, loadingBase,
  isBelowMinSeed, seedUnavailableReason,
  balanceCheckEnabled = true,
}: Props) {
  const useSeedInput = isEdit || !balanceCheckEnabled
  const isOff = !balanceCheckEnabled
  const showWarning = !isOff && (isBelowMinSeed || seedUnavailableReason !== null)

  return (
    <div className="py-[18px] border-b border-border">
      <StrategyFieldLabel
        hint={isEdit ? '전략 총 시드 기준으로 수정' : isOff ? BALANCE_OFF_BADGE : 'USD 예수금 기준 · 드래그하거나 입력'}
      >
        {useSeedInput ? '시드 금액' : '사용 비율'}
      </StrategyFieldLabel>

      {useSeedInput ? (
        <SeedAmountInput
          value={seedUsdInput}
          onChange={setSeedUsdInput}
          deposit={usdDeposit}
          minSeed={minSeed}
          disabled={loading}
        />
      ) : (
        <PercentGauge
          value={pct}
          onChange={setPct}
          deposit={usdDeposit}
          minSeed={minSeed}
          disabled={loading || loadingBase}
        />
      )}

      {showWarning && (
        <div className="inline-flex items-center gap-1.5 text-sm font-bold mt-3">
          {loadingBase ? (
            <>
              <Loader2 size={14} className="animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">예수금 조회 중...</span>
            </>
          ) : isBelowMinSeed && minSeed !== null ? (
            <>
              <AlertTriangle size={14} style={{ color: 'var(--warn)' }} />
              <span style={{ color: 'var(--warn)' }}>최소 ${fmtUsd(minSeed)} 필요</span>
            </>
          ) : seedUnavailableReason === 'NO_PRIVACY_BASE' ? (
            <>
              <AlertTriangle size={14} style={{ color: 'var(--warn)' }} />
              <span style={{ color: 'var(--warn)' }}>기준 매매표가 없습니다</span>
            </>
          ) : null}
        </div>
      )}

    </div>
  )
}
