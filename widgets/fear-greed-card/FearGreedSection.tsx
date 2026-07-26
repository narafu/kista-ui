'use client'

import { useState } from 'react'
import { useFearGreedQuery } from '@entities/market'
import { FearGreedCard } from './FearGreedCard'

const CNN_OPTIONS = [200, 120, 50, 20] as const
const CRYPTO_OPTIONS = [365, 180, 90, 30] as const

export function FearGreedSection() {
  const [cnnDays, setCnnDays] = useState<(typeof CNN_OPTIONS)[number]>(200)
  const [cryptoDays, setCryptoDays] = useState<(typeof CRYPTO_OPTIONS)[number]>(365)

  const { data: cnnData, isError: isCnnError } = useFearGreedQuery(cnnDays)
  const { data: cryptoData, isError: isCryptoError } = useFearGreedQuery(cryptoDays)

  return (
    <>
      <FearGreedCard
        title="CNN 공포탐욕지수"
        data={cnnData?.cnn}
        error={isCnnError}
        days={cnnDays}
        onDaysChange={(d) => setCnnDays(d as (typeof CNN_OPTIONS)[number])}
        daysOptions={CNN_OPTIONS}
      />
      <FearGreedCard
        title="크립토 공포탐욕지수"
        data={cryptoData?.crypto}
        error={isCryptoError}
        days={cryptoDays}
        onDaysChange={(d) => setCryptoDays(d as (typeof CRYPTO_OPTIONS)[number])}
        daysOptions={CRYPTO_OPTIONS}
      />
    </>
  )
}
