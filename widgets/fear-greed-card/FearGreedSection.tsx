'use client'

import { useFearGreedQuery } from '@entities/market'
import { FearGreedCard } from './FearGreedCard'

export function FearGreedSection() {
  const { data } = useFearGreedQuery(90)
  return (
    <>
      <FearGreedCard title="CNN 공포탐욕지수" data={data?.cnn} />
      <FearGreedCard title="크립토 공포탐욕지수" data={data?.crypto} />
    </>
  )
}
