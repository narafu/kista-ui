import type { AssetClass, AssetSnapshot, FinanceTransaction, Market } from '../model/types'
import type { CategoryIndex } from './categoryIndex'
import { resolveCategory } from './categoryIndex'
import { formatAssetL1CategoryLabel } from './aggregate'

// 일괄 등록 프리뷰 한 행 — id는 소스월 원본(스냅샷/거래) id를 그대로 쓴다(행별 포함/제외·금액
// 수정 상태를 이 id로 키잉하므로 소스 데이터가 바뀌지 않는 한 안정적이다).
export interface BulkRegisterItem {
  id: string
  categoryId: string
  categoryName: string
  rootId: string
  rootLabel: string
  memo?: string
  amount: number
  included: boolean
  // 자산 전용
  assetClass?: AssetClass
  market?: Market
  strategy?: string
  accountId?: string
}

export interface BulkRegisterGroup {
  rootId: string
  rootLabel: string
  items: BulkRegisterItem[]
}

export interface BulkRegisterItems {
  asset: BulkRegisterGroup[]
  income: BulkRegisterGroup[]
  expense: BulkRegisterGroup[]
  saving: BulkRegisterGroup[]
}

// 정렬 기준: 카테고리(그룹 라벨 › 리프 이름) › 자산군 › 메모 › 금액. 그룹 헤딩(rootLabel)은
// 가나다순으로, 그룹 내부는 위 기준 그대로 정렬한다.
function groupAndSort(items: BulkRegisterItem[]): BulkRegisterGroup[] {
  const byRoot = new Map<string, BulkRegisterItem[]>()
  for (const item of items) {
    const list = byRoot.get(item.rootId) ?? []
    list.push(item)
    byRoot.set(item.rootId, list)
  }
  const groups: BulkRegisterGroup[] = []
  for (const groupItems of byRoot.values()) {
    groupItems.sort((a, b) =>
      a.categoryName.localeCompare(b.categoryName, 'ko') ||
      (a.assetClass ?? '').localeCompare(b.assetClass ?? '') ||
      (a.memo ?? '').localeCompare(b.memo ?? '') ||
      a.amount - b.amount,
    )
    groups.push({ rootId: groupItems[0].rootId, rootLabel: groupItems[0].rootLabel, items: groupItems })
  }
  groups.sort((a, b) => a.rootLabel.localeCompare(b.rootLabel, 'ko'))
  return groups
}

// 소스월의 자산 스냅샷 + 거래내역을 프리뷰 화면용 편집 가능 아이템으로 변환한다. 거래내역은
// index(buildCategoryIndex({INCOME,EXPENSE,SAVING})로 만든 값)로 타입을 분류하고, 자산은
// AssetSnapshot 응답이 이미 갖고 있는 rootCategoryId/categoryName을 그대로 쓴다(카테고리 재조회 불필요).
// 카테고리가 삭제돼 index에 없는 거래는 어느 섹션에도 넣지 않는다(FinanceRecordList와 동일 정책).
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
      rootId: entry.rootId,
      rootLabel: index.get(entry.rootId)?.name ?? entry.name,
      memo: t.memo,
      amount: t.amount,
      included: true,
    }
    if (entry.type === 'INCOME') income.push(item)
    else if (entry.type === 'EXPENSE') expense.push(item)
    else if (entry.type === 'SAVING') saving.push(item)
  }

  const asset: BulkRegisterItem[] = assetSnapshots.map((s) => ({
    id: s.id,
    categoryId: s.categoryId,
    categoryName: s.categoryName,
    rootId: s.rootCategoryId,
    rootLabel: formatAssetL1CategoryLabel(s.rootCategoryId),
    memo: s.memo,
    amount: s.amount,
    included: true,
    assetClass: s.assetClass,
    market: s.market,
    strategy: s.strategy,
    accountId: s.accountId,
  }))

  return {
    asset: groupAndSort(asset),
    income: groupAndSort(income),
    expense: groupAndSort(expense),
    saving: groupAndSort(saving),
  }
}
