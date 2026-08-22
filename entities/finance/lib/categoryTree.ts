import type { FinanceCategory } from '../model/types'

// id까지의 조상 경로(루트부터 자기 자신까지)를 반환한다. 없으면 빈 배열.
// 계단식 Select의 초기 선택 상태를 기존 categoryId로부터 복원할 때 사용한다.
export function getCategoryPath(categories: FinanceCategory[], id: string): FinanceCategory[] {
  for (const c of categories) {
    if (c.id === id) return [c]
    const childPath = getCategoryPath(c.children, id)
    if (childPath.length > 0) return [c, ...childPath]
  }
  return []
}

// id 노드 자신 + 그 아래 모든 하위 카테고리 id를 반환한다. 계단식 필터가 중간 depth에서
// 멈췄을 때(예: 3단 트리에서 2단만 선택) 그 하위 전부를 매칭하는 용도로 쓴다.
export function collectSubtreeIds(categories: FinanceCategory[], id: string): string[] {
  const path = getCategoryPath(categories, id)
  const node = path[path.length - 1]
  if (!node) return []

  const ids: string[] = [node.id]
  function walk(children: FinanceCategory[]) {
    for (const c of children) {
      ids.push(c.id)
      walk(c.children)
    }
  }
  walk(node.children)
  return ids
}

// selectedPath(각 단계에서 선택한 categoryId)를 기준으로 렌더링할 계단식 Select 단(레벨)을 계산한다.
// 마지막으로 선택한 노드에 children이 있을 때만 다음 단을 추가하므로, 트리 깊이가 늘어나도
// 이 함수 호출부는 그대로 유지된다.
// sortCategoryTree로 전체 트리를 미리 정렬해두면(재귀 정렬이라 한 번으로 모든 depth를 커버) 이후
// 단(level) 전환은 이미 정렬된 children을 그대로 쓴다 — 계단식 Select를 쓰는 모든 소비처가 이 함수
// 하나를 거치므로 동순위(가나다) tie-break이 여기 한 곳에만 있으면 전부에 적용된다.
export function getCascadeLevels(categories: FinanceCategory[], selectedPath: string[]): FinanceCategory[][] {
  const sorted = sortCategoryTree(categories)
  const levels: FinanceCategory[][] = [sorted]
  let nodes = sorted
  for (const id of selectedPath) {
    const selected = nodes.find((n) => n.id === id)
    if (!selected || selected.children.length === 0) break
    nodes = selected.children
    levels.push(nodes)
  }
  return levels
}

// sortOrder 오름차순, 동순위는 가나다순(ko locale)으로 트리 전체(재귀)를 정렬한 새 배열을 반환한다.
// 관리자 화면이 정렬순서 0을 허용하면서(일반 사용자는 1부터) 동순위 충돌이 늘어 표시 순서 tie-break이 필요해졌다.
export function sortCategoryTree(categories: FinanceCategory[]): FinanceCategory[] {
  return [...categories]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ko'))
    .map((c) => ({ ...c, children: sortCategoryTree(c.children) }))
}
