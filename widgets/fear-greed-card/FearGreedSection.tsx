'use client'

import { useFearGreedQuery, CHART_CANDLE_COUNT } from '@entities/market'
import { FearGreedCard } from './FearGreedCard'

export function FearGreedSection() {
  const { data } = useFearGreedQuery(CHART_CANDLE_COUNT)
  return (
    <>
      <FearGreedCard title="CNN 공포탐욕지수" data={data?.cnn} />
      <FearGreedCard title="크립토 공포탐욕지수" data={data?.crypto} />
    </>
  )
}
