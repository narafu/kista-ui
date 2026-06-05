'use client'

import { Check, AlertTriangle, Loader2 } from 'lucide-react'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import { PercentGauge } from '@widgets/percent-gauge'

function fmtUsd(n: number, digits = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

interface Props {
  pct: number
  setPct: (pct: number) => void
  usdDeposit: number | null
  minSeed: number | null
  loading: boolean
  loadingBase: boolean
  isBelowMinSeed: boolean
  isInfinite: boolean
  privacyBase: number | null
  basePrice: number | null
}

export function UsageRatioSection({
  pct, setPct, usdDeposit, minSeed, loading, loadingBase,
  isBelowMinSeed, isInfinite, privacyBase, basePrice,
}: Props) {
  return (
    <div className="py-[18px] border-b border-border">
      <StrategyFieldLabel hint="USD 예수금 기준 · 드래그하거나 입력">
        사용 비율
      </StrategyFieldLabel>

      {loadingBase ? (
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs py-3">
          <Loader2 size={14} className="animate-spin" />
          예수금 조회 중...
        </div>
      ) : (
        <>
          <PercentGauge
            value={pct}
            onChange={setPct}
            deposit={usdDeposit}
            minSeed={minSeed}
            disabled={loading}
          />

          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold mt-3">
            {isBelowMinSeed && minSeed !== null ? (
              <>
                <span className="size-[14px]" style={{ color: 'var(--warn)' }}>
                  <AlertTriangle size={14} />
                </span>
                <span style={{ color: 'var(--warn)' }}>최소 ${fmtUsd(minSeed)} 필요</span>
              </>
            ) : !isInfinite && privacyBase === null ? (
              <>
                <span className="size-[14px]" style={{ color: 'var(--warn)' }}>
                  <AlertTriangle size={14} />
                </span>
                <span style={{ color: 'var(--warn)' }}>기준 매매표가 없습니다</span>
              </>
            ) : basePrice !== null ? (
              <>
                <span className="size-[14px]" style={{ color: 'var(--status-ok)' }}>
                  <Check size={14} />
                </span>
                <span style={{ color: 'var(--status-ok)' }}>유효한 입력</span>
              </>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
