'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import { PercentGauge, SeedAmountInput } from '@widgets/percent-gauge'
import { fmtUsd } from '@shared/lib/format'

interface Props {
  pct: number
  setPct: (pct: number) => void
  seedUsdInput: number | null
  setSeedUsdInput: (v: number | null) => void
  usdDeposit: number | null
  minSeed: number | null
  loading: boolean
  loadingBase: boolean
  isBelowMinSeed: boolean
  isInfinite: boolean
  privacyBase: number | null
  balanceCheckEnabled?: boolean
}

export function UsageRatioSection({
  pct, setPct, seedUsdInput, setSeedUsdInput,
  usdDeposit, minSeed, loading, loadingBase,
  isBelowMinSeed, isInfinite, privacyBase,
  balanceCheckEnabled = true,
}: Props) {
  const isOff = !balanceCheckEnabled

  return (
    <div className="py-[18px] border-b border-border">
      <StrategyFieldLabel
        hint={isOff
          ? <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
              style={{ background: 'var(--rose-50, rgba(251,207,232,.15))', color: 'var(--rose-500)', borderColor: 'var(--rose-300)' }}
            >
              잔고검증 OFF
            </span>
          : 'USD 예수금 기준 · 드래그하거나 입력'
        }
      >
        {isOff ? '시드 금액' : '사용 비율'}
      </StrategyFieldLabel>

      {isOff ? (
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

      {!isOff && (isBelowMinSeed || (!isInfinite && privacyBase === null)) && (
        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold mt-3">
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
          ) : !isInfinite && privacyBase === null ? (
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
