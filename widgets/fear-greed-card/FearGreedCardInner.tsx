'use client'

import type { FearGreedPoint, FearGreedSourceView } from '@entities/market'
import { cn } from '@shared/lib/utils'
import { FearGreedGauge } from './FearGreedGauge'
import { FearGreedTrend } from './FearGreedTrend'

interface Props {
  title: string
  data: FearGreedSourceView | undefined
  days: number
  onDaysChange: (days: number) => void
  daysOptions: readonly number[]
}

// history는 오름차순이고 마지막이 current — 전일은 직전 기록, 전주는 7일 전 이하 중 가장 최근 기록
function deltas(history: FearGreedPoint[]) {
  const current = history.at(-1)
  if (!current) return { day: null, week: null }
  const weekAgo = new Date(`${current.date}T00:00:00Z`)
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7)
  const weekAgoDate = weekAgo.toISOString().slice(0, 10)
  const prevDay = history.at(-2)
  const prevWeek = history.findLast((p) => p.date <= weekAgoDate)
  return {
    day: prevDay ? current.value - prevDay.value : null,
    week: prevWeek ? current.value - prevWeek.value : null,
  }
}

function Delta({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null
  return (
    <span className="text-xs text-muted-foreground">
      {label}{' '}
      <span className={cn('font-medium tabular-nums', value > 0 ? 'text-pos' : value < 0 ? 'text-neg' : 'text-muted-foreground')}>
        {value > 0 ? `+${value}` : value}
      </span>
    </span>
  )
}

export default function FearGreedCardInner({ title, data, days, onDaysChange, daysOptions }: Props) {
  const current = data?.current
  const { day, week } = deltas(data?.history ?? [])

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
              aria-pressed={days === n}
              className={`text-xs px-1.5 py-1 rounded font-medium transition-colors ${
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
          <div className="flex justify-center gap-3">
            <Delta label="전일대비" value={day} />
            <Delta label="전주대비" value={week} />
          </div>
          <FearGreedTrend history={data?.history ?? []} />
        </>
      ) : (
        <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
          데이터 없음
        </div>
      )}
    </div>
  )
}
