'use client'

import dynamic from 'next/dynamic'
import { Surface } from '@shared/ui/Surface'
import type { FearGreedSourceView } from '@entities/market'

const FearGreedCardInner = dynamic(() => import('./FearGreedCardInner'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">
      차트 불러오는 중…
    </div>
  ),
})

interface Props {
  title: string
  data: FearGreedSourceView | undefined
  error?: boolean
  days: number
  onDaysChange: (days: number) => void
  daysOptions: readonly number[]
}

export function FearGreedCard({ title, data, error, days, onDaysChange, daysOptions }: Props) {
  return (
    <Surface className="p-5 flex flex-col gap-2">
      {error ? (
        <div className="flex h-[250px] items-center justify-center text-sm text-warn">공포탐욕지수를 불러오지 못했습니다</div>
      ) : (
        <FearGreedCardInner title={title} data={data} days={days} onDaysChange={onDaysChange} daysOptions={daysOptions} />
      )}
    </Surface>
  )
}
