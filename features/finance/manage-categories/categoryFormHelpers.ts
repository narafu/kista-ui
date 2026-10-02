import { getCategoryPath } from '@entities/finance'
import type { FinanceCategory, FinanceCategoryRequest, FinanceCategoryType } from '@entities/finance'

// Base UI Select는 빈 문자열 value를 허용하지 않는다 — AssetForm의 NO_ACCOUNT_VALUE와 동일한 센티널 패턴.
export const NO_PARENT_VALUE = 'NONE'

export const initialCategoryName = (category: FinanceCategory | null) => category?.name ?? ''
export const initialSortOrder = (category: FinanceCategory | null) => String(category?.sortOrder ?? 1)

export function isPersonalParent(l1Categories: FinanceCategory[], parentId: string): boolean {
  if (parentId === NO_PARENT_VALUE) return false
  const parent = getCategoryPath(l1Categories, parentId).at(-1)
  return parent != null && !parent.groupId
}

export function buildCategoryPayload(
  mode: 'create' | 'edit',
  category: FinanceCategory | null,
  parentId: string,
  type: FinanceCategoryType,
  name: string,
  sortOrder: string,
): FinanceCategoryRequest {
  // PUT은 parentId/type을 서버가 무시하지만 요청 스키마상 필수라 기존 값을 그대로 실어 보낸다.
  const createParentId = parentId === NO_PARENT_VALUE ? undefined : parentId
  return {
    parentId: mode === 'edit' ? category?.parentId : createParentId,
    type,
    name: name.trim(),
    sortOrder: Math.max(1, Math.trunc(Number(sortOrder)) || 1),
  }
}
