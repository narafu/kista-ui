'use client'

import type { FearGreedSourceView } from '@entities/market'
import { FearGreedGauge } from './FearGreedGauge'
import { FearGreedTrend } from './FearGreedTrend'
import { zoneOf } from './fearGreedZones'

interface Props {
  title: string
  data: FearGreedSourceView | undefined
  days: number
  onDaysChange: (days: number) => void
  daysOptions: readonly number[]
}

export default function FearGreedCardInner({ title, data, days, onDaysChange, daysOptions }: Props) {
  const current = data?.current
  const color = current ? zoneOf(current.value).color : '#9CA3AF'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">일봉</span>
        </div>
        <div className="flex items-center gap-1">
          {daysOptions.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onDaysChange(n)}
              className={`text-xs px-1.5 py-0.5 rounded font-medium transition-colors ${
                days === n
                  ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      {current && (
        <span className="text-xs text-muted-foreground">
          {current.date.replace(/-/g, '.')} KST
        </span>
      )}
      {current ? (
        <>
          <FearGreedGauge value={current.value} />
          <FearGreedTrend history={data?.history ?? []} color={color} />
        </>
      ) : (
        <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
          데이터 없음
        </div>
      )}
    </div>
  )
}
