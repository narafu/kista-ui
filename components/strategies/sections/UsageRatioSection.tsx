'use client'

import { Check, AlertTriangle, Loader2 } from 'lucide-react'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import { PercentGauge } from '../PercentGauge'

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
    <div style={{ padding: '18px 0 18px', borderBottom: '1px solid var(--border)' }}>
      <StrategyFieldLabel hint="USD 예수금 기준 · 드래그하거나 입력">
        사용 비율
      </StrategyFieldLabel>

      {loadingBase ? (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: 'var(--muted-foreground)', fontSize: 12, padding: '12px 0',
          }}
        >
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

          <div
            style={{
              display: 'inline-flex', alignItems: 'center',
              gap: 6, fontSize: 11, fontWeight: 700, marginTop: 12,
            }}
          >
            {isBelowMinSeed && minSeed !== null ? (
              <>
                <span style={{ width: 14, height: 14, color: 'var(--warn)' }}>
                  <AlertTriangle size={14} />
                </span>
                <span style={{ color: 'var(--warn)' }}>최소 ${fmtUsd(minSeed)} 필요</span>
              </>
            ) : !isInfinite && privacyBase === null ? (
              <>
                <span style={{ width: 14, height: 14, color: 'var(--warn)' }}>
                  <AlertTriangle size={14} />
                </span>
                <span style={{ color: 'var(--warn)' }}>기준 매매표가 없습니다</span>
              </>
            ) : basePrice !== null ? (
              <>
                <span style={{ width: 14, height: 14, color: 'var(--status-ok)' }}>
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
