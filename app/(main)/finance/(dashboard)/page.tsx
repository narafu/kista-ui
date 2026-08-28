'use client'

import { useMemo, useState } from 'react'
import { listAvailableMonths, useAssetSnapshotsQuery } from '@entities/finance'
import { AssetOverview } from '@widgets/asset-overview'
import { AssetTrend } from '@widgets/asset-trend'
import { AssetComposition } from '@widgets/asset-composition'
import { AssetRecordCheck } from '@widgets/asset-record-check'
import { AssetRecordList } from '@widgets/asset-record-list'

export default function FinanceInvestmentPage() {
  const { data: snapshots = [] } = useAssetSnapshotsQuery()
  const months = useMemo(() => listAvailableMonths(snapshots), [snapshots])
  const [month, setMonth] = useState<string | null>(null)
  // 사용자가 고른 월이 더 이상 목록에 없으면(그 달의 기록을 전부 삭제한 경우 등) 최신 월로 폴백한다 —
  // AssetTrendInner의 effectiveSelector와 동일한 렌더 중 파생 계산(useEffect로 동기화하지 않는다).
  const selectedMonth = month && months.includes(month) ? month : (months[0] ?? null)

  return (
    <div className="space-y-6">
      <AssetOverview month={selectedMonth} months={months} onMonthChange={setMonth} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AssetTrend className="order-2 lg:order-1" />
        <AssetComposition className="order-1 lg:order-2" />
      </div>
      <AssetRecordCheck month={selectedMonth} />
      <AssetRecordList />
    </div>
  )
}
