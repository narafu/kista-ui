'use client'

import { Surface } from '@shared/ui/Surface'
import { SectionTitle } from '@shared/ui/SectionTitle'
import { SectionError } from '@shared/ui/SectionError'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { YearMonthSelect } from '@shared/ui/YearMonthSelect'
import { maskAmount } from '@shared/lib/format'
import { useAmountHiddenPreference } from '@shared/lib/hooks/use-amount-hidden'
import { useMeta } from '@entities/meta'
import { useAssetSummaryQuery } from '@entities/finance'
import { RevealableValue } from '@widgets/revealable-value'
import { AssetClassSection, CategorySection, SummaryKpis } from './AssetOverviewParts'

interface Props {
  month: string
  // 요약 조회 월 — undefined면 서버가 최근 기록 월로 응답한다. 사용자가 월을 고르지 않았을 때 페이지의 기본 월
  // 조회(같은 키)와 캐시를 공유해 첫 진입에 같은 요약을 두 번 받지 않는다.
  summaryMonth: string | undefined
  onMonthChange: (month: string) => void
  today: string
  selectedCategoryId?: string
  onCategorySelect: (categoryId: string) => void
}

export function AssetOverview({ month, summaryMonth, onMonthChange, today, selectedCategoryId, onCategorySelect }: Props) {
  // 선택 월 요약과 전월(기록이 있는 직전 달) 요약을 서버가 함께 준다.
  const { data, isLoading, isError } = useAssetSummaryQuery(summaryMonth)
  const { labelOf } = useMeta()
  const { hidden, masked } = useAmountHiddenPreference()

  function amountValue(display: string) {
    if (!masked) return display
    // 설정을 읽기 전(hidden === null)엔 보기 버튼 없이 가리기만 한다
    return hidden ? <RevealableValue value={display} hiddenDisplay={maskAmount(display)} /> : maskAmount(display)
  }

  const summary = data?.current ?? null
  const previousSummary = data?.previous ?? null
  const categoryDelta = (categoryId: string, amount: number): number | null => {
    if (!previousSummary) return null
    const previousAmount = previousSummary.categoryBreakdown.find((entry) => entry.categoryId === categoryId)?.amount ?? 0
    return amount - previousAmount
  }
  const assetClassDelta = (assetClass: string, amount: number): number | null => {
    if (!previousSummary) return null
    const previousAmount = previousSummary.assetClassBreakdown.find((entry) => entry.assetClass === assetClass)?.amount ?? 0
    return amount - previousAmount
  }

  return (
    <Surface size="compact" className="flex flex-col gap-4 overflow-hidden text-sm">
      <div className="flex flex-row items-center justify-between gap-3 pb-3">
        <SectionTitle>자산 요약</SectionTitle>
        <YearMonthSelect value={month} onValueChange={onMonthChange} today={today} />
      </div>
      <div>
        {isLoading ? (
          <LoadingRow />
        ) : isError && !data ? (
          <SectionError message="자산 요약을 불러오지 못했습니다." />
        ) : !summary || summary.recordCount === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">표시할 자산 기록이 없습니다.</p>
        ) : (
          <div className="space-y-6">
            <SummaryKpis summary={summary} previousSummary={previousSummary} amountValue={amountValue} labelOf={labelOf} />
            <CategorySection breakdown={summary.categoryBreakdown} delta={categoryDelta} selectedCategoryId={selectedCategoryId} onCategorySelect={onCategorySelect} />
            <AssetClassSection breakdown={summary.assetClassBreakdown} delta={assetClassDelta} labelOf={labelOf} />
          </div>
        )}
      </div>
    </Surface>
  )
}
