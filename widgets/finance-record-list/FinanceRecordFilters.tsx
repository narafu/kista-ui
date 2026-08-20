'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { FinanceCategory } from '@entities/finance'
import { getCascadeLevels } from '@entities/finance'

export const ALL_FILTER_VALUE = 'ALL'

interface Props {
  categoryTree: FinanceCategory[]
  categoryPath: string[]
  onCategoryPathChange: (path: string[]) => void
}

// AssetRecordFilters의 계단식 카테고리 필터 부분만 이식 — 이 위젯은 기간(월 select)·자산군·시장
// 필터가 없다(부모가 이미 period로 범위를 고정한다, "전체 기간" 옵션 자체가 없음).
export function FinanceRecordFilters({ categoryTree, categoryPath, onCategoryPathChange }: Props) {
  const cascadeLevels = getCascadeLevels(categoryTree, categoryPath)

  return (
    <div className="flex flex-wrap gap-2">
      <Select
        items={[{ value: ALL_FILTER_VALUE, label: '전체' }, ...cascadeLevels[0].map((c) => ({ value: c.id, label: c.name }))]}
        value={categoryPath[0] ?? ALL_FILTER_VALUE}
        onValueChange={(value) => {
          if (!value) return
          onCategoryPathChange(value === ALL_FILTER_VALUE ? [] : [value])
        }}
      >
        <SelectTrigger aria-label="카테고리" className="w-full lg:w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_FILTER_VALUE}>전체</SelectItem>
          {cascadeLevels[0].map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
      {cascadeLevels.slice(1).map((level, i) => {
        const levelIndex = i + 1
        return (
          <Select
            key={levelIndex}
            items={[{ value: ALL_FILTER_VALUE, label: '전체' }, ...level.map((c) => ({ value: c.id, label: c.name }))]}
            value={categoryPath[levelIndex] ?? ALL_FILTER_VALUE}
            onValueChange={(value) => {
              if (!value) return
              onCategoryPathChange(value === ALL_FILTER_VALUE ? categoryPath.slice(0, levelIndex) : [...categoryPath.slice(0, levelIndex), value])
            }}
          >
            <SelectTrigger aria-label={`하위 카테고리 ${levelIndex}`} className="w-full lg:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>전체</SelectItem>
              {level.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )
      })}
    </div>
  )
}
