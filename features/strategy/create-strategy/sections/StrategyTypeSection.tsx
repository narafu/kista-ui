'use client'

import { Zap, Activity } from 'lucide-react'
import { cn } from '@lib/utils'
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
    <div className="py-[18px] border-b border-border">
      <StrategyFieldLabel hint="계좌당 1개">매매 전략</StrategyFieldLabel>
      {initial ? (
        <div className="flex items-center gap-2 px-[14px] py-3 rounded-[var(--r-sm)] border border-border bg-muted">
          <span className="text-[13px] font-[800] text-rose-600">
            {initial.type}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted-foreground text-card tracking-[0.06em]">
            고정
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {strategyTypes.map((t) => {
            const selected = type === t.code
            const singleTicker = (t.availableTickers?.length ?? 0) <= 1
            return (
              <button
                key={t.code}
                type="button"
                onClick={() => setType(t.code)}
                disabled={loading}
                className={cn(
                  'flex items-center gap-2 px-[14px] py-4 rounded-[var(--r-md)] text-left transition-[border-color,background] duration-150',
                  loading ? 'cursor-not-allowed' : 'cursor-pointer',
                )}
                style={{
                  border: selected ? '1.5px solid var(--rose-500)' : '1px solid var(--border)',
                  background: selected ? 'var(--rose-50)' : 'var(--card)',
                  boxShadow: selected ? 'var(--sh-card)' : 'none',
                }}
              >
                <span
                  className="size-4 shrink-0"
                  style={{ color: selected ? 'var(--rose-600)' : 'var(--muted-foreground)' }}
                >
                  {singleTicker ? <Activity size={16} /> : <Zap size={16} />}
                </span>
                <span
                  className="text-sm font-[800]"
                  style={{ color: selected ? 'var(--rose-600)' : 'var(--foreground)' }}
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
