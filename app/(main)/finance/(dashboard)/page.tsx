'use client'

import { useMemo, useRef, useState } from 'react'
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
  const { userMonth, setMonth, trendMonths, setTrendMonths } = useFinancePeriod()
  const selectedMonth = userMonth ?? months[0] ?? today.slice(0, 7)

  // 자산 요약의 카테고리 행 클릭 → 자산 기록 카테고리 필터. 두 위젯이 공유하는 상태라 여기(app)가 소유한다.
  // 행이 최상위(L1) 카테고리라 경로는 그 id 하나다.
  const [categoryPath, setCategoryPath] = useState<string[]>([])
  // 클릭마다 목록을 다시 마운트해 이전에 걸어 둔 자산군·시장 필터를 초기화한다 — 남겨 두면 "투자 + 현금"처럼 빈 결과가 나온다.
  const [listResetKey, setListResetKey] = useState(0)
  const recordListRef = useRef<HTMLDivElement>(null)

  function handleMonthChange(month: string) {
    setMonth(month)
    setCategoryPath([])
  }

  function handleCategorySelect(categoryId: string) {
    setCategoryPath([categoryId])
    setListResetKey((key) => key + 1)
    recordListRef.current?.scrollIntoView({ block: 'start' })
  }

  return (
    <div className="space-y-6">
      <AssetOverview month={selectedMonth} months={months} onMonthChange={handleMonthChange} today={today} onCategorySelect={handleCategorySelect} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AssetTrend month={selectedMonth} range={trendMonths} onRangeChange={setTrendMonths} />
        <AssetComposition month={selectedMonth} range={trendMonths} onRangeChange={setTrendMonths} />
      </div>
      <AssetRecordCheck month={selectedMonth} />
      <div ref={recordListRef} className="scroll-mt-20">
        <AssetRecordList key={listResetKey} month={selectedMonth} categoryPath={categoryPath} onCategoryPathChange={setCategoryPath} />
      </div>
    </div>
  )
}
