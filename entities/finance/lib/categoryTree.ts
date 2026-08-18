import type { FinanceCategory } from '../model/types'

export interface FlatFinanceCategory {
  id: string
  name: string
  depth: 0 | 1
}

// GET /api/finance/categories는 L1에 children이 중첩된 트리로 응답한다 — 폼 Select와
// ID→이름 조회 양쪽에서 평탄한 목록이 필요해 공용 헬퍼로 뺀다. L1 먼저, 그 아래 children 순서.
export function flattenFinanceCategories(categories: FinanceCategory[]): FlatFinanceCategory[] {
  return categories.flatMap((l1) => [
    { id: l1.id, name: l1.name, depth: 0 as const },
    ...l1.children.map((l2) => ({ id: l2.id, name: l2.name, depth: 1 as const })),
  ])
}
