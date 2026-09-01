import type { FinanceCategory, FinanceCategoryType } from '../model/types'

export interface CategoryIndexEntry {
  type: FinanceCategoryType
  rootId: string // L1 카테고리 id (자기 자신이면 rootId === id)
  name: string
  path: { id: string; name: string }[] // 루트부터 자기 자신까지 전체 경로(대분류→…→자기 자신) — 일괄 등록 프리뷰의 계층 그룹핑에 사용
  sortOrder: number // rootId의 sortOrder — 색상·정렬에 사용 (entities/finance/lib/colors.ts)
}

export type CategoryIndex = Map<string, CategoryIndexEntry>

// INCOME/EXPENSE/SAVING 세 트리를 한 번에 순회해 categoryId -> {type, rootId, name} 인덱스를 만든다.
// 거래(FinanceTransactionResponse)엔 type/categoryName/rootCategoryId가 없어(kista-api 응답 스키마)
// 탭 소속·라벨·L1 그룹핑을 전부 이 인덱스로 클라이언트에서 판정해야 한다.
//
// 삭제된 카테고리를 가리키는 거래는 이 인덱스에 없다 — GET /categories가 deleted_at IS NULL만
// 반환하기 때문(kista-api FinanceCategoryJpaRepository.findSelectableByGroup). 그런 거래는
// 어느 탭 집계에도 넣지 말고 "분류할 수 없는 내역"으로 별도 표시한다(lib/flowAggregate.ts 참고).
export function buildCategoryIndex(trees: Partial<Record<FinanceCategoryType, FinanceCategory[]>>): CategoryIndex {
  const index: CategoryIndex = new Map()
  for (const [type, roots] of Object.entries(trees) as [FinanceCategoryType, FinanceCategory[] | undefined][]) {
    if (!roots) continue
    for (const root of roots) {
      walk(root, root, type, index, [])
    }
  }
  return index
}

function walk(
  node: FinanceCategory,
  root: FinanceCategory,
  type: FinanceCategoryType,
  index: CategoryIndex,
  ancestors: { id: string; name: string }[],
) {
  const path = [...ancestors, { id: node.id, name: node.name }]
  index.set(node.id, { type, rootId: root.id, name: node.name, path, sortOrder: root.sortOrder })
  for (const child of node.children) {
    walk(child, root, type, index, path)
  }
}

export function resolveCategory(index: CategoryIndex, categoryId: string): CategoryIndexEntry | undefined {
  return index.get(categoryId)
}
