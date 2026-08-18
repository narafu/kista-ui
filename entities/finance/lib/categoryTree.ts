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
export function getCascadeLevels(categories: FinanceCategory[], selectedPath: string[]): FinanceCategory[][] {
  const levels: FinanceCategory[][] = [categories]
  let nodes = categories
  for (const id of selectedPath) {
    const selected = nodes.find((n) => n.id === id)
    if (!selected || selected.children.length === 0) break
    nodes = selected.children
    levels.push(nodes)
  }
  return levels
}
