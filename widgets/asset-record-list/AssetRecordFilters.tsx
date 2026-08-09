'use client'

import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatAssetCategoryLabel } from '@shared/lib/api-schema'
import { ASSET_CATEGORIES } from '@entities/asset'
import type { AssetCategory } from '@entities/asset'

export const ALL_FILTER_VALUE = 'ALL'
export type AssetFilterValue = typeof ALL_FILTER_VALUE | string

interface Props {
  month: AssetFilterValue
  category: AssetFilterValue
  assetClass: AssetFilterValue
  subcategoryQuery: string
  months: string[]
  assetClasses: string[]
  onMonthChange: (value: AssetFilterValue) => void
  onCategoryChange: (value: AssetFilterValue) => void
  onAssetClassChange: (value: AssetFilterValue) => void
  onSubcategoryQueryChange: (value: string) => void
}

export function AssetRecordFilters({
  month,
  category,
  assetClass,
  subcategoryQuery,
  months,
  assetClasses,
  onMonthChange,
  onCategoryChange,
  onAssetClassChange,
  onSubcategoryQueryChange,
}: Props) {
  const monthOptions = [[ALL_FILTER_VALUE, '전체 기간'], ...months.map((m) => [m, m])] as const
  const categoryOptions = [
    [ALL_FILTER_VALUE, '전체'],
    ...ASSET_CATEGORIES.map((c) => [c, formatAssetCategoryLabel(c)] as const),
  ] as const
  const assetClassOptions = [[ALL_FILTER_VALUE, '전체'], ...assetClasses.map((c) => [c, c])] as const

  return (
    <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center lg:flex-wrap">
      <Select items={monthOptions.map(([value, label]) => ({ value, label }))} value={month} onValueChange={(value) => { if (value) onMonthChange(value) }}>
        <SelectTrigger aria-label="기준월" className="w-full lg:w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
          {monthOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select
        items={categoryOptions.map(([value, label]) => ({ value, label }))}
        value={category as AssetCategory | typeof ALL_FILTER_VALUE}
        onValueChange={(value) => { if (value) onCategoryChange(value) }}
      >
        <SelectTrigger aria-label="카테고리" className="w-full lg:w-28"><SelectValue /></SelectTrigger>
        <SelectContent>
          {categoryOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select items={assetClassOptions.map(([value, label]) => ({ value, label }))} value={assetClass} onValueChange={(value) => { if (value) onAssetClassChange(value) }}>
        <SelectTrigger aria-label="자산군" className="w-full lg:w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
          {assetClassOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input
        placeholder="세부 구분 검색"
        value={subcategoryQuery}
        onChange={(e) => onSubcategoryQueryChange(e.target.value)}
        className="col-span-2 h-9 lg:w-40"
      />
    </div>
  )
}
