'use client'

import { AlertTriangle } from 'lucide-react'
import { Spinner } from '@shared/ui/Spinner'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import { PercentGauge, SeedAmountInput } from '@shared/ui/percent-gauge'
import { fmtUsd } from '@shared/lib/format'

function offBadge(label: string) {
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full border"
      style={{ background: 'var(--rose-50)', color: 'var(--rose-500)', borderColor: 'var(--rose-300)' }}
    >
      {label}
    </span>
  )
}

interface Props {
  hint?: React.ReactNode
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
  offBadgeLabel?: string
}

export function UsageRatioSection({
  hint,
  pct, setPct, seedUsdInput, setSeedUsdInput,
  usdDeposit, minSeed, loading, loadingBase,
  isBelowMinSeed, seedUnavailableReason,
  balanceCheckEnabled = true,
  offBadgeLabel,
}: Props) {
  const useSeedInput = !balanceCheckEnabled
  const isOff = !balanceCheckEnabled
  const showWarning = !isOff && (isBelowMinSeed || seedUnavailableReason !== null)

  return (
    <div className="py-[18px] border-b border-border">
      <StrategyFieldLabel
        hint={hint ?? (isOff ? offBadge(offBadgeLabel ?? '잔고검증 OFF') : 'USD 예수금 기준 · 드래그하거나 입력')}
      >
        {useSeedInput ? '예수금' : '사용 비율'}
      </StrategyFieldLabel>

      {useSeedInput ? (
        <SeedAmountInput
          value={seedUsdInput}
          onChange={setSeedUsdInput}
          deposit={usdDeposit}
          minSeed={minSeed}
          disabled={loading}
          showStatus={balanceCheckEnabled}
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
              <Spinner size={14} className="text-muted-foreground" />
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
              <span style={{ color: 'var(--warn)' }}>P 매매표가 없습니다</span>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
