'use client'

import { useState } from 'react'
import { useFearGreedQuery } from '@entities/market'
import { FearGreedCard } from './FearGreedCard'

// 두 지수 모두 일별 값이라 달력 단위(1년·반년·분기·한 달)로 고른다
const DAYS_OPTIONS = [365, 180, 90, 30] as const
type Days = (typeof DAYS_OPTIONS)[number]

export function FearGreedSection() {
  const [cnnDays, setCnnDays] = useState<Days>(30)
  const [cryptoDays, setCryptoDays] = useState<Days>(30)

  const { data: cnnData, isError: isCnnError, isPending: isCnnPending } = useFearGreedQuery(cnnDays)
  const { data: cryptoData, isError: isCryptoError, isPending: isCryptoPending } = useFearGreedQuery(cryptoDays)

  return (
    <>
      <FearGreedCard
        title="CNN 공포탐욕지수"
        data={cnnData?.cnn}
        error={isCnnError}
        loading={isCnnPending}
        days={cnnDays}
        onDaysChange={(d) => setCnnDays(d as Days)}
        daysOptions={DAYS_OPTIONS}
      />
      <FearGreedCard
        title="크립토 공포탐욕지수"
        data={cryptoData?.crypto}
        error={isCryptoError}
        loading={isCryptoPending}
        days={cryptoDays}
        onDaysChange={(d) => setCryptoDays(d as Days)}
        daysOptions={DAYS_OPTIONS}
      />
    </>
  )
}
