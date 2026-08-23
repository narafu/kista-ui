'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const ALL_FILTER_VALUE = 'ALL'

interface CategoryOption {
  id: string
  name: string
}

interface Props {
  // entities/finance의 getCascadeLevels(categoryTree, path) 결과를 그대로 넘긴다 — 구조적 타입만
  // 요구해(id/name) shared/ 계층이 entities/를 import하지 않고도 재사용할 수 있다.
  levels: CategoryOption[][]
  path: string[]
  onPathChange: (path: string[]) => void
  // true(기본값)면 모든 레벨에 "전체"(필터 해제) 옵션을 둔다 — 목록 필터 용도.
  // false면 "전체" 없이 선택이 필수다 — 예산/자산 등록 폼처럼 카테고리 지정이 필수인 곳에서 쓴다.
  allowClear?: boolean
  levelAriaLabel?: (levelIndex: number) => string
  className?: string
}

/**
 * 임의 depth 계단식 카테고리 Select — 거래내역/예산/자산 기록 필터, 예산 등록 폼이 동일한
 * getCascadeLevels 기반 UI를 재사용한다.
 */
export function CascadingCategorySelect({ levels, path, onPathChange, allowClear = true, levelAriaLabel, className }: Props) {
  return (
    <>
      {levels.map((level, levelIndex) => {
        const items = allowClear
          ? [{ value: ALL_FILTER_VALUE, label: '전체' }, ...level.map((c) => ({ value: c.id, label: c.name }))]
          : level.map((c) => ({ value: c.id, label: c.name }))
        const value = allowClear ? (path[levelIndex] ?? ALL_FILTER_VALUE) : (path[levelIndex] || null)
        return (
          <Select
            key={levelIndex}
            items={items}
            value={value}
            onValueChange={(next) => {
              if (!next) return
              if (next === ALL_FILTER_VALUE) {
                onPathChange(levelIndex === 0 ? [] : path.slice(0, levelIndex))
              } else {
                onPathChange([...path.slice(0, levelIndex), next])
              }
            }}
          >
            <SelectTrigger aria-label={levelAriaLabel?.(levelIndex) ?? (levelIndex === 0 ? '카테고리' : `하위 카테고리 ${levelIndex}`)} className={className}>
              <SelectValue placeholder={!allowClear ? '카테고리 선택' : undefined} />
            </SelectTrigger>
            <SelectContent>
              {allowClear && <SelectItem value={ALL_FILTER_VALUE}>전체</SelectItem>}
              {level.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )
      })}
    </>
  )
}
