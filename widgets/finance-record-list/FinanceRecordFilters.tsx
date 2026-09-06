'use client'

import { useMemo } from 'react'
import { CascadingCategorySelect } from '@shared/ui/CascadingCategorySelect'
import type { FinanceCategory } from '@entities/finance'
import { getCascadeLevels } from '@entities/finance'

interface Props {
  categoryTree: FinanceCategory[]
  categoryPath: string[]
  onCategoryPathChange: (path: string[]) => void
}

// AssetRecordFilters의 계단식 카테고리 필터 부분만 이식 — 이 위젯은 자산군·시장 필터가 없고,
// 기준월도 자체 필터로 두지 않는다(상단 기간 선택기가 조회 범위를 결정, AssetRecordFilters와 동일).
export function FinanceRecordFilters({ categoryTree, categoryPath, onCategoryPathChange }: Props) {
  const cascadeLevels = useMemo(() => getCascadeLevels(categoryTree, categoryPath), [categoryTree, categoryPath])

  return (
    <div className="flex flex-wrap gap-2">
      <CascadingCategorySelect levels={cascadeLevels} path={categoryPath} onPathChange={onCategoryPathChange} className="w-full lg:w-32" />
    </div>
  )
}
