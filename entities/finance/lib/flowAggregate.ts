import { collectSubtreeIds } from './categoryTree'
import type { CategoryIndex } from './categoryIndex'
import { monthEndDate, monthStartDate, periodRange, shiftMonth } from './period'
import type { Period } from './period'
import type { FinanceBudget, FinanceCategory, FinanceCategoryType, FinanceTransaction } from '../model/types'

// 수입/소비/저축 탭 공용 집계 — entities/finance/lib/aggregate.ts(AssetSnapshot 전용, entryDate/
// rootCategoryId/assetClass 형태)와는 형태가 달라 일반화하지 않고 별도 모듈로 둔다.
// 모든 함수는 12개월 윈도우 쿼리(windowRange)로 받아온 거래 목록을 입력으로 받아 클라이언트에서
// 기간별로 잘라 쓴다 — 설계 근거는 docs/agents/entities.md finance 항목 참고.

function sumAmount(list: FinanceTransaction[]): number {
  return list.reduce((total, t) => total + t.amount, 0)
}

function inRange(dateStr: string, from: string, to: string): boolean {
  return dateStr >= from && dateStr <= to
}

function flattenTreeIds(categories: FinanceCategory[]): string[] {
  return categories.flatMap((c) => [c.id, ...flattenTreeIds(c.children)])
}

// 카테고리가 삭제돼 인덱스에서 조회되지 않는 거래는 어느 탭에도 속하지 않는다 —
// unclassifiedTransactions()로 별도 집계해 "분류할 수 없는 내역"으로 노출한다.
export function filterByType(transactions: FinanceTransaction[], index: CategoryIndex, type: FinanceCategoryType): FinanceTransaction[] {
  return transactions.filter((t) => index.get(t.categoryId)?.type === type)
}

export function unclassifiedTransactions(transactions: FinanceTransaction[], index: CategoryIndex): FinanceTransaction[] {
  return transactions.filter((t) => !index.has(t.categoryId))
}

export interface FlowSummary {
  total: number
  count: number
  // 월간 모드에서만 값이 들어온다. 연간(YTD) 모드는 null — "전월 대비" 카드를 숨기라는 신호로 쓴다
  // (YTD 누적값과 단일 월값을 비교하는 건 의미가 없다).
  previousTotal: number | null
}

// transactions는 filterByType()으로 이미 타입 필터링된 목록을 받는다(호출부가 한 번만 필터링해 재사용).
export function calcFlowSummary(transactions: FinanceTransaction[], period: Period, today: string): FlowSummary {
  const { from, to } = periodRange(period, today)
  const inPeriod = transactions.filter((t) => inRange(t.transactionDate, from, to))
  const total = sumAmount(inPeriod)
  const count = inPeriod.length

  if (period.mode === 'yearly') return { total, count, previousTotal: null }

  const prevRange = periodRange({ month: shiftMonth(period.month, -1), mode: 'monthly' }, today)
  const previousTotal = sumAmount(transactions.filter((t) => inRange(t.transactionDate, prevRange.from, prevRange.to)))
  return { total, count, previousTotal }
}

// entities/finance/lib/aggregate.ts의 TrendPoint(AssetSnapshot 전용)와 이름이 겹쳐 Flow 접두를 붙인다.
export interface FlowTrendPoint {
  period: string // 월간 모드: 'YYYY-MM', 연간 모드: 'YYYY' — 차트 x축 라벨
  amount: number
  byCategory: Record<string, number> // rootId -> 합계, 카테고리별 라인용
}

function trendBuckets(period: Period, today: string, limit: number): { label: string; from: string; to: string }[] {
  if (period.mode === 'monthly') {
    const months: string[] = []
    for (let i = limit - 1; i >= 0; i--) months.push(shiftMonth(period.month, -i))
    return months.map((m) => ({ label: m, from: monthStartDate(m), to: monthEndDate(m) }))
  }
  const year = Number(period.month.slice(0, 4))
  const years: number[] = []
  for (let i = limit - 1; i >= 0; i--) years.push(year - i)
  // 버킷별 to는 periodRange와 동일한 규칙(과거 연도는 12월까지, 올해는 오늘까지)을 그대로 쓴다 —
  // 안 그러면 같은 연도인데 요약 카드 합계와 추이 차트 마지막 점이 서로 다른 값을 보이게 된다.
  return years.map((y) => {
    const { from, to } = periodRange({ month: `${y}-01`, mode: 'yearly' }, today)
    return { label: String(y), from, to }
  })
}

// transactions: 월간 모드는 windowRange(12개월) 윈도우, 연간 모드는 yearsRange(limit년) 윈도우를
// 호출부가 각각 맞춰 넘긴다(타입 필터링만 된 상태). index로 거래를 rootId별로도 함께 집계한다.
export function calcFlowTrend(transactions: FinanceTransaction[], index: CategoryIndex, period: Period, today: string, limit = 6): FlowTrendPoint[] {
  return trendBuckets(period, today, limit).map(({ label, from, to }) => {
    const inBucket = transactions.filter((t) => inRange(t.transactionDate, from, to))
    const byCategory: Record<string, number> = {}
    for (const t of inBucket) {
      const rootId = index.get(t.categoryId)?.rootId
      if (!rootId) continue
      byCategory[rootId] = (byCategory[rootId] ?? 0) + t.amount
    }
    return { period: label, amount: sumAmount(inBucket), byCategory }
  })
}

function budgetValidInMonth(budget: FinanceBudget, month: string): boolean {
  const start = monthStartDate(month)
  const end = monthEndDate(month)
  return budget.applyStartDate <= end && (!budget.applyEndDate || budget.applyEndDate >= start)
}

// fromMonth~toMonth(포함) 구간 중 예산이 유효했던 개월 수. 월간 모드는 fromMonth===toMonth라
// 결과가 0 또는 1(그 달에 유효한지 여부)이 되고, 연간(YTD) 모드는 1월~선택월 중 유효 개월만 센다 —
// applyStartDate=2026-06 예산을 12월 YTD로 보면 6이 아니라 7(6~12월)이다.
function validMonthCount(budget: FinanceBudget, fromMonth: string, toMonth: string): number {
  let count = 0
  let m = fromMonth
  while (m <= toMonth) {
    if (budgetValidInMonth(budget, m)) count++
    m = shiftMonth(m, 1)
  }
  return count
}

export interface BudgetProgress {
  budgetId: string
  categoryId: string
  categoryName: string
  allocated: number // 월 할당액 × 유효 개월 수
  actual: number
  remaining: number // 음수면 초과
  usageRatio: number // allocated=0이면 0
}

// budgets: 소비 또는 저축 한 타입의 예산만 전달한다. categoryTree: 같은 타입의 카테고리 트리
// (collectSubtreeIds가 예산 카테고리의 하위 트리 전체를 실적 집계에 포함하기 위해 필요) —
// 정렬 결과가 표시 순번이 되므로 반드시 sortCategoryTree로 미리 정렬해서 넘긴다(호출부에서 이미
// orderedRootIds 계산에 sortCategoryTree를 쓰는 경우가 많아, 여기서 또 정렬하면 렌더마다 트리를
// 두 번 재귀 정렬하는 중복이 생긴다).
// transactionsOfType: filterByType()로 같은 타입만 걸러진, 12개월 윈도우 전체 목록.
export function calcBudgetProgress(
  budgets: FinanceBudget[],
  transactionsOfType: FinanceTransaction[],
  categoryTree: FinanceCategory[],
  index: CategoryIndex,
  period: Period,
  today: string,
): BudgetProgress[] {
  const { from, to } = periodRange(period, today)
  const yearStart = `${period.month.slice(0, 4)}-01`
  const fromMonth = period.mode === 'yearly' ? yearStart : period.month
  // to(periodRange 결과)를 그대로 월 단위로 잘라 쓴다 — 연간 모드에서 올해면 "오늘 달"까지,
  // 과거 연도면 "12월"까지가 자동으로 나온다(period.month의 mm은 신뢰할 수 없다, periodRange 주석 참고).
  const toMonth = to.slice(0, 7)

  const results: BudgetProgress[] = []
  for (const budget of budgets) {
    const entry = index.get(budget.categoryId)
    if (!entry) continue // 카테고리가 삭제돼 이름/타입을 복구할 수 없음 — 표시하지 않는다

    const validMonths = validMonthCount(budget, fromMonth, toMonth)
    if (validMonths === 0) continue

    const subtreeIds = new Set(collectSubtreeIds(categoryTree, budget.categoryId))
    const actual = sumAmount(
      transactionsOfType.filter((t) => subtreeIds.has(t.categoryId) && inRange(t.transactionDate, from, to)),
    )
    const allocated = budget.amount * validMonths

    results.push({
      budgetId: budget.id,
      categoryId: budget.categoryId,
      categoryName: entry.name,
      allocated,
      actual,
      remaining: allocated - actual,
      usageRatio: allocated > 0 ? actual / allocated : 0,
    })
  }
  // 카테고리 고정 순번(카테고리 관리 화면과 동일한 sortCategoryTree 순서)으로 정렬한다 —
  // usageRatio desc로 정렬하면 월간/연간 실제 사용률이 달라 표시 순서가 모드마다 뒤바뀌는
  // 문제가 있었다(급여/상여 순서 흔들림). categoryTree는 이미 정렬된 상태로 받는다(위 주석 참고).
  const displayOrder = flattenTreeIds(categoryTree)
  return results.sort((a, b) => displayOrder.indexOf(a.categoryId) - displayOrder.indexOf(b.categoryId))
}

export interface BudgetTreeNode {
  categoryId: string
  categoryName: string
  depth: number
  // true = 자체 예산이 없어 하위 예산 합만 보여주는 그룹 노드(Σ). false = 자체 예산 항목.
  isGroup: boolean
  budgetId?: string // isGroup=false일 때만
  allocated: number
  actual: number
  remaining: number
  usageRatio: number
  children: BudgetTreeNode[]
}

function shiftDepth(node: BudgetTreeNode, delta: number): BudgetTreeNode {
  if (delta === 0) return node
  return { ...node, depth: node.depth - delta, children: node.children.map((c) => shiftDepth(c, delta)) }
}

// calcBudgetProgress의 flat 목록(예산 1건 = 항목 1개)을 카테고리 계층 트리로 재구성한다 —
// 수입/소비/저축 예산 대비 위젯이 중간 카테고리 소계와 함께 재귀 렌더한다.
// categoryTree는 calcBudgetProgress와 동일하게 sortCategoryTree로 미리 정렬해서 넘긴다(표시 순번).
// 규칙:
// - 자체 예산이 있는 노드: 그 BudgetProgress 숫자를 그대로 쓰고(실적은 이미 서브트리 전체 집계) 하위를 중첩
// - 자체 예산이 없지만 하위에 예산이 있는 노드: 직속 하위들의 표시값 합을 소계로 갖는 그룹 노드
// - 자체 예산도 없고 하위에도 예산이 없는 가지: 렌더하지 않음(가지치기)
// - 자체 예산 없고 하위가 1개뿐인 그룹 노드: 소계가 그 하위와 동일해 중복이므로 노드를 생략하고 하위를 끌어올림
export function buildBudgetProgressTree(progress: BudgetProgress[], categoryTree: FinanceCategory[]): BudgetTreeNode[] {
  const byCategory = new Map(progress.map((entry) => [entry.categoryId, entry]))

  function build(node: FinanceCategory, depth: number): BudgetTreeNode | null {
    const children = node.children
      .map((child) => build(child, depth + 1))
      .filter((built): built is BudgetTreeNode => built !== null)
    const own = byCategory.get(node.id)

    if (!own && children.length === 0) return null

    if (own) {
      return {
        categoryId: node.id,
        categoryName: node.name,
        depth,
        isGroup: false,
        budgetId: own.budgetId,
        allocated: own.allocated,
        actual: own.actual,
        remaining: own.remaining,
        usageRatio: own.usageRatio,
        children,
      }
    }

    // build(x, d)는 항상 depth===d인 노드를 돌려주므로 유일 하위는 depth+1 → delta는 항상 1.
    if (children.length === 1) return shiftDepth(children[0], 1)

    const allocated = children.reduce((sum, child) => sum + child.allocated, 0)
    const actual = children.reduce((sum, child) => sum + child.actual, 0)
    return {
      categoryId: node.id,
      categoryName: node.name,
      depth,
      isGroup: true,
      allocated,
      actual,
      remaining: allocated - actual,
      usageRatio: allocated > 0 ? actual / allocated : 0,
      children,
    }
  }

  return categoryTree
    .map((root) => build(root, 0))
    .filter((built): built is BudgetTreeNode => built !== null)
}

export interface UnbudgetedCategory {
  categoryId: string
  categoryName: string
  amount: number
}

// 이 기간에 지출/수입 실적은 있는데 예산이 없는 카테고리 — 예산은 어느 depth에나 걸 수 있어
// "커버됨"의 기준은 유효 예산의 categoryId 서브트리 전체다(calcBudgetProgress의 actual 집계와
// 동일 기준). 예산 없는 실적을 내역 리스트에서만 발견하기 쉬운 문제를 보완하기 위한 별도 섹션용.
export function calcUnbudgetedCategories(
  budgets: FinanceBudget[],
  transactionsOfType: FinanceTransaction[],
  categoryTree: FinanceCategory[],
  index: CategoryIndex,
  period: Period,
  today: string,
): UnbudgetedCategory[] {
  const { from, to } = periodRange(period, today)
  const yearStart = `${period.month.slice(0, 4)}-01`
  const fromMonth = period.mode === 'yearly' ? yearStart : period.month
  const toMonth = to.slice(0, 7)

  const coveredIds = new Set<string>()
  for (const budget of budgets) {
    if (validMonthCount(budget, fromMonth, toMonth) === 0) continue
    for (const id of collectSubtreeIds(categoryTree, budget.categoryId)) coveredIds.add(id)
  }

  const byCategory = new Map<string, number>()
  for (const t of transactionsOfType) {
    if (!inRange(t.transactionDate, from, to) || coveredIds.has(t.categoryId)) continue
    const entry = index.get(t.categoryId)
    if (!entry) continue // 삭제된 카테고리는 unclassifiedTransactions()가 별도로 다룬다
    byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + t.amount)
  }

  const displayOrder = flattenTreeIds(categoryTree)
  return [...byCategory.entries()]
    .map(([categoryId, amount]) => ({ categoryId, categoryName: index.get(categoryId)!.name, amount }))
    .sort((a, b) => displayOrder.indexOf(a.categoryId) - displayOrder.indexOf(b.categoryId))
}
