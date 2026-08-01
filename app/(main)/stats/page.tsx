import type { Metadata } from 'next'
import { getAuthToken } from '@shared/lib/auth/token'
import { todayKst } from '@shared/lib/format'
import { kstDateMinusDays } from '@shared/lib/date-range'
import { getEquityCurve, getStatsSummary } from '@entities/stats'
import { StatsOverview } from '@widgets/stats-overview'
import { PageHeader } from '@widgets/page-header'

export const metadata: Metadata = {
  title: '통계 | KISTA',
}

// StatsOverview 기본 range='3M'과 동일한 산식(90일 차감)이어야
// 위젯의 isInitialParams 판정이 initialCurve를 그대로 재사용한다.
const DEFAULT_RANGE_DAYS = 90

export default async function StatsPage() {
  const token = await getAuthToken()

  const defaultTo = todayKst()
  const defaultFrom = kstDateMinusDays(DEFAULT_RANGE_DAYS)

  const [summary, curve] = token
    ? await Promise.all([
        getStatsSummary(token).catch(() => undefined),
        getEquityCurve({ from: defaultFrom, to: defaultTo }, token).catch(
          () => undefined
        ),
      ])
    : [undefined, undefined]

  return (
    <>
      <PageHeader eyebrow="Stats" title="통계" />
      <StatsOverview
        initialSummary={summary}
        initialCurve={curve}
        defaultFrom={defaultFrom}
        defaultTo={defaultTo}
      />
    </>
  )
}
