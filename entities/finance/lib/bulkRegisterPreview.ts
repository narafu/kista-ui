import type { AssetClass, AssetSnapshot, FinanceTransaction, Market } from '../model/types'
import type { CategoryIndex } from './categoryIndex'
import { resolveCategory } from './categoryIndex'
import { formatAssetL1CategoryLabel } from './aggregate'

// 일괄 등록 프리뷰 한 행 — id는 소스월 원본(스냅샷/거래) id를 그대로 쓴다(행별 포함/제외·금액
// 수정 상태를 이 id로 키잉하므로 소스 데이터가 바뀌지 않는 한 안정적이다).
export interface BulkRegisterItem {
  id: string
  categoryId: string
  categoryName: string // 리프(자신) 카테고리명 — categoryPath 마지막 항목과 동일
  categoryPath: { id: string; name: string; sortOrder: number }[] // 대분류→…→자신 전체 경로, 계층 그룹핑에 사용. sortOrder는 각 세그먼트 자신의 관리자 정렬순서
  memo?: string
  amount: number
  included: boolean
  // 자산 전용
  assetClass?: AssetClass
  market?: Market
  strategy?: string
  accountId?: string
  accountName?: string
}

// 카테고리 경로 기준 계층 그룹 노드 — 대분류/중분류/소분류를 트리 깊이만큼만 생성한다
// (트리가 2단이면 소분류 레벨 자체가 생기지 않는다). 중간 depth에 직접 등록된 항목(하위
// 카테고리가 있는 노드에 리프로 등록된 경우)은 그 노드의 items에, 더 깊은 하위는 children에 담긴다.
export interface CategoryGroupNode {
  id: string
  name: string
  sortOrder: number
  items: BulkRegisterItem[]
  children: CategoryGroupNode[]
}

export interface BulkRegisterItems {
  asset: CategoryGroupNode[]
  income: CategoryGroupNode[]
  expense: CategoryGroupNode[]
  saving: CategoryGroupNode[]
}

function sortItems(items: BulkRegisterItem[]): BulkRegisterItem[] {
  return [...items].sort((a, b) =>
    (a.accountName ?? '').localeCompare(b.accountName ?? '', 'ko') ||
    (a.strategy ?? '').localeCompare(b.strategy ?? '', 'ko') ||
    (a.market ?? '').localeCompare(b.market ?? '') ||
    (a.assetClass ?? '').localeCompare(b.assetClass ?? '') ||
    (a.memo ?? '').localeCompare(b.memo ?? '') ||
    a.amount - b.amount,
  )
}

interface MutableNode {
  id: string
  name: string
  sortOrder: number
  items: BulkRegisterItem[]
  childMap: Map<string, MutableNode>
}

// sortOrder 오름차순, 동순위는 가나다순 — categoryTree.sortCategoryTree와 동일한 tie-break 규칙(관리자
// 카테고리 화면 정렬순서를 그대로 반영, 이름순이 아니다).
function finalizeGroupTree(map: Map<string, MutableNode>): CategoryGroupNode[] {
  const nodes = [...map.values()].map((n) => ({
    id: n.id,
    name: n.name,
    sortOrder: n.sortOrder,
    items: sortItems(n.items),
    children: finalizeGroupTree(n.childMap),
  }))
  nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ko'))
  return nodes
}

// item.categoryPath(대분류→…→자신)를 그대로 트리 경로로 삼아 items를 중첩 그룹으로 묶는다.
function buildGroupTree(items: BulkRegisterItem[]): CategoryGroupNode[] {
  const rootMap = new Map<string, MutableNode>()
  for (const item of items) {
    let siblingMap = rootMap
    let node: MutableNode | undefined
    for (const seg of item.categoryPath) {
      let next = siblingMap.get(seg.id)
      if (!next) {
        next = { id: seg.id, name: seg.name, sortOrder: seg.sortOrder, items: [], childMap: new Map() }
        siblingMap.set(seg.id, next)
      }
      node = next
      siblingMap = next.childMap
    }
    node?.items.push(item)
  }
  return finalizeGroupTree(rootMap)
}

// 소스월의 자산 스냅샷 + 거래내역을 프리뷰 화면용 편집 가능 아이템으로 변환한다. 거래내역은
// index(buildCategoryIndex({ASSET,INCOME,EXPENSE,SAVING})로 만든 값)로 타입·전체 경로를 해석한다.
// 카테고리가 삭제돼 index에 없는 거래는 어느 섹션에도 넣지 않는다(FinanceRecordList와 동일 정책).
// 자산은 카테고리가 삭제돼 index에 없어도 응답의 rootCategoryId/categoryName으로 1~2단 경로를
// 만들어 계속 포함한다(AssetSnapshot 응답이 이 필드를 항상 갖고 있어 기존 동작을 유지).
export function buildBulkRegisterItems({
  transactions,
  assetSnapshots,
  index,
}: {
  transactions: FinanceTransaction[]
  assetSnapshots: AssetSnapshot[]
  index: CategoryIndex
}): BulkRegisterItems {
  const income: BulkRegisterItem[] = []
  const expense: BulkRegisterItem[] = []
  const saving: BulkRegisterItem[] = []

  for (const t of transactions) {
    const entry = resolveCategory(index, t.categoryId)
    if (!entry) continue
    const item: BulkRegisterItem = {
      id: t.id,
      categoryId: t.categoryId,
      categoryName: entry.name,
      categoryPath: entry.path,
      memo: t.memo,
      amount: t.amount,
      included: true,
    }
    if (entry.type === 'INCOME') income.push(item)
    else if (entry.type === 'EXPENSE') expense.push(item)
    else if (entry.type === 'SAVING') saving.push(item)
  }

  const asset: BulkRegisterItem[] = assetSnapshots.map((s) => {
    const entry = resolveCategory(index, s.categoryId)
    // 삭제된 카테고리라 index에 없는 경우 실제 sortOrder를 알 수 없다 — 맨 뒤로 밀려나도록
    // Number.MAX_SAFE_INTEGER로 채운다(정상 카테고리는 이 값보다 항상 작다).
    const categoryPath = entry?.path ?? [
      { id: s.rootCategoryId, name: formatAssetL1CategoryLabel(s.rootCategoryId), sortOrder: Number.MAX_SAFE_INTEGER },
      ...(s.categoryId !== s.rootCategoryId ? [{ id: s.categoryId, name: s.categoryName, sortOrder: Number.MAX_SAFE_INTEGER }] : []),
    ]
    return {
      id: s.id,
      categoryId: s.categoryId,
      categoryName: s.categoryName,
      categoryPath,
      memo: s.memo,
      amount: s.amount,
      included: true,
      assetClass: s.assetClass,
      market: s.market,
      strategy: s.strategy,
      accountId: s.accountId,
      accountName: s.accountName,
    }
  })

  return {
    asset: buildGroupTree(asset),
    income: buildGroupTree(income),
    expense: buildGroupTree(expense),
    saving: buildGroupTree(saving),
  }
}
