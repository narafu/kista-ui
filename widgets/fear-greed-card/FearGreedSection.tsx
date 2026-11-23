'use client'

import { useState } from 'react'
import { useFearGreedQuery, type FearGreedSourceView } from '@entities/market'
import { toKstDateString } from '@shared/lib/format'
import { FearGreedCard } from './FearGreedCard'

// 0은 전체 기간(서버가 KST 주별 마지막 값으로 축약). 나머지는 일별 값이라 달력 단위(1년·반년·분기·한 달)로 고른다
const ALL_DAYS = 0
const DAYS_OPTIONS = [ALL_DAYS, 365, 180, 90, 30] as const
type Days = (typeof DAYS_OPTIONS)[number]
const DAILY_DAYS = 365
const DAY_MS = 24 * 60 * 60 * 1000

const SOURCES = [
  { key: 'cnn', title: 'CNN 공포탐욕지수' },
  { key: 'crypto', title: '크립토 공포탐욕지수' },
] as const
type Source = (typeof SOURCES)[number]['key']

// kista-api와 같은 기준(KST 오늘 - days일 이후)으로 자른다 — 1년치를 한 번만 받아 토글마다 재조회·로딩이 생기지 않게
function sliceDays(view: FearGreedSourceView | undefined, days: number): FearGreedSourceView | undefined {
  if (!view) return view
  const since = toKstDateString(new Date(Date.now() - days * DAY_MS))
  return { ...view, history: view.history.filter((p) => toKstDateString(p.date) >= since) }
}

export function FearGreedSection() {
  const [days, setDays] = useState<Record<Source, Days>>({ cnn: 30, crypto: 30 })

  const daily = useFearGreedQuery(DAILY_DAYS)
  // 전체 기간은 ALL을 고른 카드가 있을 때만 받는다 — 첫 화면 조회를 1년치 하나로 유지
  const all = useFearGreedQuery(ALL_DAYS, days.cnn === ALL_DAYS || days.crypto === ALL_DAYS)

  return (
    <>
      {SOURCES.map(({ key, title }) => {
        const isAll = days[key] === ALL_DAYS
        const query = isAll ? all : daily
        return (
          <FearGreedCard
            key={key}
            title={title}
            data={isAll ? query.data?.[key] : sliceDays(query.data?.[key], days[key])}
            // 전체 기간은 주별이라 증감을 일별 이력으로만 계산한다 — 일별을 아직 못 받았으면 빈 배열로 증감을 숨긴다
            deltaHistory={isAll ? (daily.data?.[key]?.history ?? []) : undefined}
            error={query.error}
            loading={query.isPending}
            days={days[key]}
            onDaysChange={(d) => setDays((prev) => ({ ...prev, [key]: d as Days }))}
            daysOptions={DAYS_OPTIONS}
          />
        )
      })}
    </>
  )
}
