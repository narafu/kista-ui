'use client'

import { Zap, Activity } from 'lucide-react'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import type { Strategy } from '@/types/strategy'
import type { StrategyTypeMeta } from '@/types/meta'

interface Props {
  initial?: Strategy
  type: string
  setType: (t: string) => void
  loading: boolean
  strategyTypes: StrategyTypeMeta[]
}

export function StrategyTypeSection({ initial, type, setType, loading, strategyTypes }: Props) {
  return (
    <div style={{ padding: '18px 0 18px', borderBottom: '1px solid var(--border)' }}>
      <StrategyFieldLabel hint="계좌당 1개">매매 전략</StrategyFieldLabel>
      {initial ? (
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 14px', borderRadius: 'var(--r-sm)',
            border: '1px solid var(--border)', background: 'var(--muted)',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--rose-600)' }}>
            {initial.type}
          </span>
          <span
            style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
              background: 'var(--muted-foreground)', color: 'var(--card)', letterSpacing: '0.06em',
            }}
          >
            고정
          </span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {strategyTypes.map((t) => {
            const selected = type === t.code
            const singleTicker = (t.availableTickers?.length ?? 0) <= 1
            return (
              <button
                key={t.code}
                type="button"
                onClick={() => setType(t.code)}
                disabled={loading}
                style={{
                  padding: '16px 14px', borderRadius: 'var(--r-md)',
                  border: selected ? '1.5px solid var(--rose-500)' : '1px solid var(--border)',
                  background: selected ? 'var(--rose-50)' : 'var(--card)',
                  boxShadow: selected ? 'var(--sh-card)' : 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  textAlign: 'left', transition: 'border-color .15s, background .15s',
                }}
              >
                <span
                  style={{
                    width: 16, height: 16, flexShrink: 0,
                    color: selected ? 'var(--rose-600)' : 'var(--muted-foreground)',
                  }}
                >
                  {singleTicker ? <Activity size={16} /> : <Zap size={16} />}
                </span>
                <span
                  style={{
                    fontSize: 14, fontWeight: 800,
                    color: selected ? 'var(--rose-600)' : 'var(--foreground)',
                  }}
                >
                  {t.code}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
