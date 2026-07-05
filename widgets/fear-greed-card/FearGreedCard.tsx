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
  days: number
  onDaysChange: (days: number) => void
  daysOptions: readonly number[]
}

export function FearGreedCard({ title, data, days, onDaysChange, daysOptions }: Props) {
  return (
    <Surface className="p-5 flex flex-col gap-2">
      <FearGreedCardInner title={title} data={data} days={days} onDaysChange={onDaysChange} daysOptions={daysOptions} />
    </Surface>
  )
}
