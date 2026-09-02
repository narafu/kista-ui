'use client'

import { useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // URL(?month=)에 실어 탭 이동·새로고침 후에도 선택 월이 유지되게 한다(수입/소비/저축탭의
  // useFinanceFlowData.ts와 동일 패턴) — 사용자가 아직 고르지 않았으면 기록이 있는 가장 최근
  // 달로, 기록이 아예 없으면 이번 달로 기본값을 잡는다.
  const selectedMonth = searchParams.get('month') ?? months[0] ?? today.slice(0, 7)

  function setMonth(month: string) {
    const params = new URLSearchParams(searchParams)
    params.set('month', month)
    router.replace(`${pathname}?${params.toString()}`)
  }

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
