'use client'

import { useMemo } from 'react'
import { listAvailableMonths, useAssetSnapshotsQuery } from '@entities/finance'
import { todayKst } from '@shared/lib/format'
import { AssetOverview } from '@widgets/asset-overview'
import { AssetTrend } from '@widgets/asset-trend'
import { AssetComposition } from '@widgets/asset-composition'
import { AssetRecordCheck } from '@widgets/asset-record-check'
import { AssetRecordList } from '@widgets/asset-record-list'
import { useFinancePeriod } from './FinancePeriodProvider'

export default function FinanceInvestmentPage() {
  const { data: snapshots = [] } = useAssetSnapshotsQuery()
  const months = useMemo(() => listAvailableMonths(snapshots), [snapshots])
  const today = todayKst()
  // 선택 월은 FinancePeriodProvider가 소유해 탭 전환 후에도 유지되고 새로고침엔 초기화된다
  // (수입/소비/저축탭과 공유). 사용자가 아직 안 골랐으면 기록이 있는 가장 최근 달로, 기록이
  // 아예 없으면 이번 달로 기본값을 잡는다.
  const { userMonth, setMonth } = useFinancePeriod()
  const selectedMonth = userMonth ?? months[0] ?? today.slice(0, 7)

  return (
    <div className="space-y-6">
      <AssetOverview month={selectedMonth} months={months} onMonthChange={setMonth} today={today} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AssetTrend month={selectedMonth} />
        <AssetComposition month={selectedMonth} />
      </div>
      <AssetRecordCheck month={selectedMonth} />
      <AssetRecordList month={selectedMonth} />
    </div>
  )
}
