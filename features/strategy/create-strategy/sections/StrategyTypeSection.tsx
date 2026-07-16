'use client'

import { Zap, Activity } from 'lucide-react'
import { SelectionCard } from '@shared/ui/selection-card'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import type { Strategy } from '@entities/strategy'
import type { StrategyTypeMeta } from '@entities/meta'

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
      <StrategyFieldLabel>매매 전략</StrategyFieldLabel>
      {initial ? (
        <div className="flex items-center gap-2 px-[14px] py-3 rounded-[var(--r-sm)] border border-border bg-muted">
          <span className="text-sm font-[800] text-rose-600">
            {initial.type}
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted-foreground text-card tracking-[0.06em]">
            고정
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {strategyTypes.length === 0 && (
            <p className="col-span-2 rounded-[var(--r-sm)] border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
              현재 등록 가능한 전략이 없습니다.
            </p>
          )}
          {strategyTypes.map((t) => {
            const selected = type === t.code
            const singleTicker = (t.availableTickers?.length ?? 0) <= 1
            return (
              <SelectionCard
                key={t.code}
                selected={selected}
                showIndicator
                onClick={() => setType(t.code)}
                disabled={loading}
                className="flex items-center gap-2 rounded-[var(--r-md)] px-[14px] py-4 pr-10"
              >
                <span className={selected ? 'size-4 shrink-0 text-[var(--selection-fg)]' : 'size-4 shrink-0 text-muted-foreground'}>
                  {singleTicker ? <Activity size={16} /> : <Zap size={16} />}
                </span>
                <span className="text-sm font-[800]">
                  {t.code}
                </span>
              </SelectionCard>
            )
          })}
        </div>
      )}
    </div>
  )
}
