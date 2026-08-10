'use client'

import { useMemo, useState } from 'react'
import { listAvailableMonths, useAssetsQuery } from '@entities/asset'
import { AssetOverview } from '@widgets/asset-overview'
import { AssetTrend } from '@widgets/asset-trend'
import { AssetComposition } from '@widgets/asset-composition'
import { AssetRecordCheck } from '@widgets/asset-record-check'
import { AssetRecordList } from '@widgets/asset-record-list'

// '자산' 페이지의 상태 소유자 — asset-overview·asset-record-check가 공유하는 "기준 월"을
// 이 컴포넌트가 소유하고 props로 흘려보낸다. 위젯끼리 cross-import가 금지돼 있어(widgets.md)
// 두 위젯이 상태를 공유하려면 app 레이어의 공통 client 부모가 필요하다.
export function AssetsDashboard() {
  const { data: assets = [] } = useAssetsQuery()
  const months = useMemo(() => listAvailableMonths(assets), [assets])
  const [month, setMonth] = useState<string | null>(null)
  // 사용자가 고른 월이 더 이상 목록에 없으면(그 달의 기록을 전부 삭제한 경우 등) 최신 월로 폴백한다 —
  // AssetTrendInner의 effectiveSelector와 동일한 렌더 중 파생 계산(useEffect로 동기화하지 않는다).
  const selectedMonth = month && months.includes(month) ? month : (months[0] ?? null)

  return (
    <div className="space-y-6">
      <AssetOverview month={selectedMonth} months={months} onMonthChange={setMonth} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AssetTrend />
        <AssetComposition />
      </div>
      <AssetRecordCheck month={selectedMonth} />
      <AssetRecordList />
    </div>
  )
}
