import { describe, expect, it } from 'vitest'
import type { FinanceCategory } from '../model/types'
import { collectSubtreeIds, getCascadeLevels, getCategoryPath } from './categoryTree'

function category(overrides: Partial<FinanceCategory> & { id: string; name: string }): FinanceCategory {
  return { type: 'ASSET', sortOrder: 0, system: false, children: [], ...overrides }
}

// L1 > L2 > L3 3단 트리 — depth가 2단을 넘어가도 정상 동작하는지 검증한다.
const TREE: FinanceCategory[] = [
  category({
    id: 'l1-a',
    name: '투자',
    children: [
      category({
        id: 'l2-a',
        name: '주식',
        children: [category({ id: 'l3-a', name: '국내주식', children: [] })],
      }),
    ],
  }),
  category({ id: 'l1-b', name: '예적금', children: [] }),
]

describe('getCategoryPath', () => {
  it('leaf까지의 조상 경로를 루트부터 반환한다', () => {
    expect(getCategoryPath(TREE, 'l3-a').map((c) => c.id)).toEqual(['l1-a', 'l2-a', 'l3-a'])
  })

  it('children이 없는 L1 노드는 자기 자신만 반환한다', () => {
    expect(getCategoryPath(TREE, 'l1-b').map((c) => c.id)).toEqual(['l1-b'])
  })

  it('존재하지 않는 id는 빈 배열을 반환한다', () => {
    expect(getCategoryPath(TREE, 'missing')).toEqual([])
  })
})

describe('collectSubtreeIds', () => {
  it('중간 depth 노드는 자기 자신 + 하위 전부를 반환한다', () => {
    expect(collectSubtreeIds(TREE, 'l2-a')).toEqual(['l2-a', 'l3-a'])
  })

  it('leaf 노드는 자기 자신만 반환한다', () => {
    expect(collectSubtreeIds(TREE, 'l3-a')).toEqual(['l3-a'])
  })

  it('존재하지 않는 id는 빈 배열을 반환한다', () => {
    expect(collectSubtreeIds(TREE, 'missing')).toEqual([])
  })
})

describe('getCascadeLevels', () => {
  it('선택 없음이면 루트 레벨만 반환한다', () => {
    expect(getCascadeLevels(TREE, [])).toEqual([TREE])
  })

  it('children이 있는 노드를 선택할 때마다 다음 레벨을 추가한다', () => {
    const levels = getCascadeLevels(TREE, ['l1-a', 'l2-a'])
    expect(levels.map((l) => l.map((c) => c.id))).toEqual([
      ['l1-a', 'l1-b'],
      ['l2-a'],
      ['l3-a'],
    ])
  })

  it('children이 없는 노드를 선택하면 그 이후 레벨을 만들지 않는다', () => {
    const levels = getCascadeLevels(TREE, ['l1-b'])
    expect(levels.map((l) => l.map((c) => c.id))).toEqual([['l1-a', 'l1-b']])
  })
})
