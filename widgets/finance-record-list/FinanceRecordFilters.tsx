'use client'

import { useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { FinanceCategory } from '@entities/finance'
import { getCascadeLevels } from '@entities/finance'

export const ALL_FILTER_VALUE = 'ALL'

interface Props {
  categoryTree: FinanceCategory[]
  categoryPath: string[]
  onCategoryPathChange: (path: string[]) => void
  // 연간 모드 전용 "기준월" 필터 — 월간 모드는 부모가 monthOptions를 빈 배열로 넘겨 숨긴다
  // (단일 달만 보는 월간 모드엔 이 필터 자체가 불필요).
  monthOptions?: string[]
  month?: string
  onMonthChange?: (value: string) => void
}

// AssetRecordFilters의 계단식 카테고리 필터 부분만 이식 — 이 위젯은 자산군·시장 필터가 없다.
// 기간(월 select)은 연간 모드에서만 monthOptions가 채워져 조건부로 나타난다("전체 기간" 옵션 포함).
export function FinanceRecordFilters({ categoryTree, categoryPath, onCategoryPathChange, monthOptions = [], month = ALL_FILTER_VALUE, onMonthChange }: Props) {
  const cascadeLevels = useMemo(() => getCascadeLevels(categoryTree, categoryPath), [categoryTree, categoryPath])

  return (
    <div className="flex flex-wrap gap-2">
      {monthOptions.length > 0 && (
        <Select
          items={[{ value: ALL_FILTER_VALUE, label: '전체 기간' }, ...monthOptions.map((m) => ({ value: m, label: m }))]}
          value={month}
          onValueChange={(value) => { if (value) onMonthChange?.(value) }}
        >
          <SelectTrigger aria-label="기준월" className="w-full lg:w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER_VALUE}>전체 기간</SelectItem>
            {monthOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
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
