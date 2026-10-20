'use client'

import { useState } from 'react'
import { useFearGreedQuery, type FearGreedSourceView } from '@entities/market'
import { toKstDateString } from '@shared/lib/format'
import { FearGreedCard } from './FearGreedCard'

// 두 지수 모두 일별 값이라 달력 단위(1년·반년·분기·한 달)로 고른다
const DAYS_OPTIONS = [365, 180, 90, 30] as const
type Days = (typeof DAYS_OPTIONS)[number]
const MAX_DAYS = DAYS_OPTIONS[0]
const DAY_MS = 24 * 60 * 60 * 1000

// kista-api와 같은 기준(KST 오늘 - days일 이후)으로 자른다 — 최대 기간을 한 번만 받아 토글마다 재조회·로딩이 생기지 않게
function sliceDays(view: FearGreedSourceView | undefined, days: Days): FearGreedSourceView | undefined {
  if (!view) return view
  const since = toKstDateString(new Date(Date.now() - days * DAY_MS))
  return { ...view, history: view.history.filter((p) => toKstDateString(p.date) >= since) }
}

export function FearGreedSection() {
  const [cnnDays, setCnnDays] = useState<Days>(30)
  const [cryptoDays, setCryptoDays] = useState<Days>(30)

  const { data, isError, isPending } = useFearGreedQuery(MAX_DAYS)

  return (
    <>
      <FearGreedCard
        title="CNN 공포탐욕지수"
        data={sliceDays(data?.cnn, cnnDays)}
        error={isError}
        loading={isPending}
        days={cnnDays}
        onDaysChange={(d) => setCnnDays(d as Days)}
        daysOptions={DAYS_OPTIONS}
      />
      <FearGreedCard
        title="크립토 공포탐욕지수"
        data={sliceDays(data?.crypto, cryptoDays)}
        error={isError}
        loading={isPending}
        days={cryptoDays}
        onDaysChange={(d) => setCryptoDays(d as Days)}
        daysOptions={DAYS_OPTIONS}
      />
    </>
  )
}
