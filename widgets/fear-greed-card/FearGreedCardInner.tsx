'use client'

import type { FearGreedSourceView } from '@entities/market'
import { FearGreedGauge } from './FearGreedGauge'
import { FearGreedTrend } from './FearGreedTrend'
import { zoneOf } from './fearGreedZones'

interface Props {
  title: string
  data: FearGreedSourceView | undefined
}

export default function FearGreedCardInner({ title, data }: Props) {
  const current = data?.current
  const color = current ? zoneOf(current.value).color : '#9CA3AF'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {current && (
          <span className="text-[10px] text-muted-foreground">
            {current.date.replace(/-/g, '.')} KST
          </span>
        )}
      </div>
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
