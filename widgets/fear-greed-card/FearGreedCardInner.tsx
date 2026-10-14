'use client'

import type { FearGreedPoint, FearGreedSourceView } from '@entities/market'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'
import { toKstDateString } from '@shared/lib/format'
import { FearGreedGauge } from './FearGreedGauge'
import { FearGreedTrend } from './FearGreedTrend'

interface Props {
  title: string
  data: FearGreedSourceView | undefined
  loading?: boolean
  days: number
  onDaysChange: (days: number) => void
  daysOptions: readonly number[]
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// history는 오름차순이고 마지막이 current — 전일은 직전 기록, 전주는 KST 기준 7일 전 이하 중 가장 최근 기록
// date는 수집 시각(ISO Instant)이라 시각 차이를 무시하려고 KST 날짜끼리 비교한다
function deltas(history: FearGreedPoint[]) {
  const current = history.at(-1)
  if (!current) return { day: null, week: null }
  const weekAgoDate = toKstDateString(new Date(Date.parse(current.date) - WEEK_MS))
  const prevDay = history.at(-2)
  const prevWeek = history.findLast((p) => toKstDateString(p.date) <= weekAgoDate)
  return {
    day: prevDay ? current.value - prevDay.value : null,
    week: prevWeek ? current.value - prevWeek.value : null,
  }
}

// 증감은 부호로만 전달한다 — 상승=빨강(--pos) 관례를 쓰면 게이지의 빨강(극공포)과 뜻이 충돌한다
function Delta({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null
  return (
    <span className="text-xs text-muted-foreground">
      {label}{' '}
      <span className="text-sm font-semibold tabular-nums text-foreground">
        {value > 0 ? `+${value}` : value}
      </span>
    </span>
  )
}

export default function FearGreedCardInner({ title, data, loading, days, onDaysChange, daysOptions }: Props) {
  const current = data?.current
  const { day, week } = deltas(data?.history ?? [])

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-y-1">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">일봉</span>
        </div>
        <SegmentedToggle
          aria-label={`${title} 조회 기간(일)`}
          options={daysOptions.map((n) => ({ value: n, label: String(n) }))}
          value={days}
          onChange={onDaysChange}
          size="sm"
          className="ml-auto"
        />
      </div>
      {current && (
        <span className="text-xs text-muted-foreground">
          {toKstDateString(current.date).replace(/-/g, '.')} KST
        </span>
      )}
      {current ? (
        <>
          <FearGreedGauge
            value={current.value}
            title={`${title} 게이지`}
            aside={
              <div className="flex flex-col">
                <Delta label="전일" value={day} />
                <Delta label="전주" value={week} />
              </div>
            }
          />
          <FearGreedTrend history={data?.history ?? []} title={`${title} 추이`} />
        </>
      ) : (
        <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
          {loading ? '불러오는 중…' : '데이터 없음'}
        </div>
      )}
    </div>
  )
}
