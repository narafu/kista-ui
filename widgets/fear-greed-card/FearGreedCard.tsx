'use client'

import dynamic from 'next/dynamic'
import { asyncFallback } from '@shared/ui/AsyncSection'
import { Surface } from '@shared/ui/Surface'
import type { FearGreedPoint, FearGreedSourceView } from '@entities/market'

const FearGreedCardInner = dynamic(() => import('./FearGreedCardInner'), {
  ssr: false,
  loading: () => asyncFallback({ isLoading: true, skeleton: 'chart', fallbackClassName: 'h-[250px]' }),
})

interface Props {
  title: string
  data: FearGreedSourceView | undefined
  error?: unknown
  loading?: boolean
  days: number
  onDaysChange: (days: number) => void
  daysOptions: readonly number[]
  deltaHistory?: FearGreedPoint[]
}

export function FearGreedCard({ title, data, error, loading, days, onDaysChange, daysOptions, deltaHistory }: Props) {
  return (
    <Surface className="p-5 flex flex-col gap-2">
      {asyncFallback({ isError: !!error && !data, error, errorMessage: '공포탐욕지수를 불러오지 못했습니다.', fallbackClassName: 'h-[250px]' }) ?? (
        <FearGreedCardInner title={title} data={data} loading={loading} days={days} onDaysChange={onDaysChange} daysOptions={daysOptions} deltaHistory={deltaHistory} />
      )}
    </Surface>
  )
}
