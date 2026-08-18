'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { EnumMeta } from '@entities/meta'
import type { FlatFinanceCategory } from '@entities/finance'

export const ALL_FILTER_VALUE = 'ALL'
export type AssetFilterValue = typeof ALL_FILTER_VALUE | string

interface Props {
  month: AssetFilterValue
  categoryId: AssetFilterValue
  assetClass: AssetFilterValue
  market: AssetFilterValue
  months: string[]
  categories: FlatFinanceCategory[]
  assetClasses: EnumMeta[]
  markets: EnumMeta[]
  onMonthChange: (value: AssetFilterValue) => void
  onCategoryChange: (value: AssetFilterValue) => void
  onAssetClassChange: (value: AssetFilterValue) => void
  onMarketChange: (value: AssetFilterValue) => void
}

// 등록 순서(기준일·카테고리·자산군·시장)와 맞춰 필터도 기간·카테고리·자산군·시장 순으로 배치한다.
// 모바일은 grid-cols-2라 자연스럽게 1행(기간·카테고리)·2행(자산군·시장)이 된다.
export function AssetRecordFilters({
  month,
  categoryId,
  assetClass,
  market,
  months,
  categories,
  assetClasses,
  markets,
  onMonthChange,
  onCategoryChange,
  onAssetClassChange,
  onMarketChange,
}: Props) {
  const monthOptions = [[ALL_FILTER_VALUE, '전체 기간'], ...months.map((m) => [m, m])] as const
  const categoryOptions = [
    [ALL_FILTER_VALUE, '전체'],
    ...categories.map((c) => [c.id, c.depth === 1 ? `― ${c.name}` : c.name] as const),
  ] as const
  const assetClassOptions = [[ALL_FILTER_VALUE, '전체'], ...assetClasses.map((c) => [c.code, c.label] as const)] as const
  const marketOptions = [[ALL_FILTER_VALUE, '전체'], ...markets.map((m) => [m.code, m.label] as const)] as const

  return (
    <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center lg:flex-wrap">
      <Select items={monthOptions.map(([value, label]) => ({ value, label }))} value={month} onValueChange={(value) => { if (value) onMonthChange(value) }}>
        <SelectTrigger aria-label="기준월" className="w-full lg:w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
          {monthOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select items={categoryOptions.map(([value, label]) => ({ value, label }))} value={categoryId} onValueChange={(value) => { if (value) onCategoryChange(value) }}>
        <SelectTrigger aria-label="카테고리" className="w-full lg:w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          {categoryOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
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
