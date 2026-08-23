'use client'

import { useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ALL_FILTER_VALUE, CascadingCategorySelect } from '@shared/ui/CascadingCategorySelect'
import type { EnumMeta } from '@entities/meta'
import type { FinanceCategory } from '@entities/finance'
import { getCascadeLevels } from '@entities/finance'

export { ALL_FILTER_VALUE }
export type AssetFilterValue = typeof ALL_FILTER_VALUE | string

interface Props {
  month: AssetFilterValue
  categoryTree: FinanceCategory[]
  categoryPath: string[]
  assetClass: AssetFilterValue
  market: AssetFilterValue
  months: string[]
  assetClasses: EnumMeta[]
  markets: EnumMeta[]
  onMonthChange: (value: AssetFilterValue) => void
  onCategoryPathChange: (path: string[]) => void
  onAssetClassChange: (value: AssetFilterValue) => void
  onMarketChange: (value: AssetFilterValue) => void
}

// 등록 순서(기준일·카테고리·자산군·시장)와 맞춰 필터도 기간·카테고리·자산군·시장 순으로 배치한다.
// 모바일은 grid-cols-2라 자연스럽게 1행(기간·카테고리)·2행(자산군·시장)이 된다.
export function AssetRecordFilters({
  month,
  categoryTree,
  categoryPath,
  assetClass,
  market,
  months,
  assetClasses,
  markets,
  onMonthChange,
  onCategoryPathChange,
  onAssetClassChange,
  onMarketChange,
}: Props) {
  const monthOptions = [[ALL_FILTER_VALUE, '전체 기간'], ...months.map((m) => [m, m])] as const
  const assetClassOptions = [[ALL_FILTER_VALUE, '전체'], ...assetClasses.map((c) => [c.code, c.label] as const)] as const
  const marketOptions = [[ALL_FILTER_VALUE, '전체'], ...markets.map((m) => [m.code, m.label] as const)] as const

  // 계단식 카테고리 필터: 특정 depth에서 멈추면 그 하위 전부를 포함해 매칭한다(AssetRecordList의
  // collectSubtreeIds 참고).
  const cascadeLevels = useMemo(() => getCascadeLevels(categoryTree, categoryPath), [categoryTree, categoryPath])

  return (
    <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center lg:flex-wrap">
      <Select items={monthOptions.map(([value, label]) => ({ value, label }))} value={month} onValueChange={(value) => { if (value) onMonthChange(value) }}>
        <SelectTrigger aria-label="기준월" className="w-full lg:w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
          {monthOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="flex flex-wrap gap-2">
        <CascadingCategorySelect levels={cascadeLevels} path={categoryPath} onPathChange={onCategoryPathChange} className="w-full lg:w-32" />
      </div>

      <Select items={assetClassOptions.map(([value, label]) => ({ value, label }))} value={assetClass} onValueChange={(value) => { if (value) onAssetClassChange(value) }}>
        <SelectTrigger aria-label="자산군" className="w-full lg:w-28"><SelectValue /></SelectTrigger>
        <SelectContent>
          {assetClassOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select items={marketOptions.map(([value, label]) => ({ value, label }))} value={market} onValueChange={(value) => { if (value) onMarketChange(value) }}>
        <SelectTrigger aria-label="시장" className="w-full lg:w-28"><SelectValue /></SelectTrigger>
        <SelectContent>
          {marketOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}
