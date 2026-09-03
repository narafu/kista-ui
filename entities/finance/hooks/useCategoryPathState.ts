'use client'

import { useEffect, useMemo, useState } from 'react'
import { getCascadeLevels, getCategoryPath } from '../lib/categoryTree'
import type { FinanceCategory } from '../model/types'

// 계단식 카테고리 Select 공통 상태 — AssetForm/TransactionFormDialog/BudgetFormDialog가 각자
// 구현하던 동일 패턴(경로 상태 + 카테고리 쿼리 늦은 로딩 대비 복원 useEffect)을 통합한다.
// seedCategoryId가 있으면(edit/duplicate) 최초 렌더와 카테고리 쿼리 도착 후 한 번 더 경로를 복원한다
// — 다이얼로그/폼이 카테고리 쿼리 로딩보다 먼저 열릴 수 있어서다. 이미 선택된 경로가 있으면 건드리지 않는다.
export function useCategoryPathState(categories: FinanceCategory[], seedCategoryId?: string) {
  const [selectedPath, setSelectedPath] = useState<string[]>(() =>
    seedCategoryId ? getCategoryPath(categories, seedCategoryId).map((c) => c.id) : []
  )
  useEffect(() => {
    if (seedCategoryId && selectedPath.length === 0 && categories.length > 0) {
      setSelectedPath(getCategoryPath(categories, seedCategoryId).map((c) => c.id))
    }
  }, [seedCategoryId, categories, selectedPath.length])
  const cascadeLevels = useMemo(() => getCascadeLevels(categories, selectedPath), [categories, selectedPath])
  const categoryId = selectedPath[selectedPath.length - 1] ?? ''

  return { selectedPath, setSelectedPath, cascadeLevels, categoryId }
}
