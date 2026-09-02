'use client'

import { useMemo, useState } from 'react'
import { listAvailableMonths, useAssetSnapshotsQuery } from '@entities/finance'
import { todayKst } from '@shared/lib/format'
import { AssetOverview } from '@widgets/asset-overview'
import { AssetTrend } from '@widgets/asset-trend'
import { AssetComposition } from '@widgets/asset-composition'
import { AssetRecordCheck } from '@widgets/asset-record-check'
import { AssetRecordList } from '@widgets/asset-record-list'

export default function FinanceInvestmentPage() {
  const { data: snapshots = [] } = useAssetSnapshotsQuery()
  const months = useMemo(() => listAvailableMonths(snapshots), [snapshots])
  const today = todayKst()
  // 사용자가 아직 직접 고르지 않았으면(month===null) 기록이 있는 가장 최근 달로, 기록이 아예 없으면
  // 이번 달로 기본값을 잡는다 — 수입/소비/저축탭과 달리 이 월은 자유 선택(임의 연도/월)이라 데이터가
  // 없는 달을 골라도 되고, 그 경우 각 위젯이 빈 상태를 표시한다.
  const [month, setMonth] = useState<string | null>(null)
  const selectedMonth = month ?? months[0] ?? today.slice(0, 7)

  return (
    <div className="space-y-6">
      <AssetOverview month={selectedMonth} months={months} onMonthChange={setMonth} today={today} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AssetTrend className="order-2 lg:order-1" />
        <AssetComposition className="order-1 lg:order-2" />
      </div>
      <AssetRecordCheck month={selectedMonth} />
      <AssetRecordList month={selectedMonth} />
    </div>
  )
}
