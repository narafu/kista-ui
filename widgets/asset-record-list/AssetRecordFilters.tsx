'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatAssetCategoryLabel } from '@shared/lib/api-schema'
import { ASSET_CATEGORIES } from '@entities/asset'
import type { AssetCategory } from '@entities/asset'

export const ALL_FILTER_VALUE = 'ALL'
export type AssetFilterValue = typeof ALL_FILTER_VALUE | string

interface Props {
  month: AssetFilterValue
  category: AssetFilterValue
  subcategory: AssetFilterValue
  assetClass: AssetFilterValue
  months: string[]
  subcategories: string[]
  assetClasses: string[]
  onMonthChange: (value: AssetFilterValue) => void
  onCategoryChange: (value: AssetFilterValue) => void
  onSubcategoryChange: (value: AssetFilterValue) => void
  onAssetClassChange: (value: AssetFilterValue) => void
}

// 등록 순서(기준일·카테고리·세부카테고리·자산군)와 맞춰 필터도 기간·카테고리·세부카테고리·자산군
// 순으로 배치한다. 모바일은 grid-cols-2라 자연스럽게 1행(기간·카테고리)·2행(세부카테고리·자산군)이 된다.
export function AssetRecordFilters({
  month,
  category,
  subcategory,
  assetClass,
  months,
  subcategories,
  assetClasses,
  onMonthChange,
  onCategoryChange,
  onSubcategoryChange,
  onAssetClassChange,
}: Props) {
  const monthOptions = [[ALL_FILTER_VALUE, '전체 기간'], ...months.map((m) => [m, m])] as const
  const categoryOptions = [
    [ALL_FILTER_VALUE, '전체'],
    ...ASSET_CATEGORIES.map((c) => [c, formatAssetCategoryLabel(c)] as const),
  ] as const
  const subcategoryOptions = [[ALL_FILTER_VALUE, '전체'], ...subcategories.map((s) => [s, s])] as const
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
      <Select items={subcategoryOptions.map(([value, label]) => ({ value, label }))} value={subcategory} onValueChange={(value) => { if (value) onSubcategoryChange(value) }}>
        <SelectTrigger aria-label="세부 카테고리" className="w-full lg:w-36"><SelectValue /></SelectTrigger>
        <SelectContent>
          {subcategoryOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select items={assetClassOptions.map(([value, label]) => ({ value, label }))} value={assetClass} onValueChange={(value) => { if (value) onAssetClassChange(value) }}>
        <SelectTrigger aria-label="자산군" className="w-full lg:w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
          {assetClassOptions.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}
