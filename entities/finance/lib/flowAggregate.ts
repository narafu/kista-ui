import { collectSubtreeIds, sortCategoryTree } from './categoryTree'
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
export function calcFlowSummary(transactions: FinanceTransaction[], period: Period): FlowSummary {
  const { from, to } = periodRange(period)
  const inPeriod = transactions.filter((t) => inRange(t.transactionDate, from, to))
  const total = sumAmount(inPeriod)
  const count = inPeriod.length

  if (period.mode === 'yearly') return { total, count, previousTotal: null }

  const prevRange = periodRange({ month: shiftMonth(period.month, -1), mode: 'monthly' })
  const previousTotal = sumAmount(transactions.filter((t) => inRange(t.transactionDate, prevRange.from, prevRange.to)))
  return { total, count, previousTotal }
}

// entities/finance/lib/aggregate.ts의 TrendPoint(AssetSnapshot 전용)와 이름이 겹쳐 Flow 접두를 붙인다.
export interface FlowTrendPoint {
  period: string // 월간 모드: 'YYYY-MM', 연간 모드: 'YYYY' — 차트 x축 라벨
  amount: number
  byCategory: Record<string, number> // rootId -> 합계, 카테고리별 라인용
}

function trendBuckets(period: Period, limit: number): { label: string; from: string; to: string }[] {
  if (period.mode === 'monthly') {
    const months: string[] = []
    for (let i = limit - 1; i >= 0; i--) months.push(shiftMonth(period.month, -i))
    return months.map((m) => ({ label: m, from: monthStartDate(m), to: monthEndDate(m) }))
  }
  const year = Number(period.month.slice(0, 4))
  const mm = period.month.slice(5, 7)
  const years: number[] = []
  for (let i = limit - 1; i >= 0; i--) years.push(year - i)
  return years.map((y) => ({ label: String(y), from: `${y}-01-01`, to: monthEndDate(`${y}-${mm}`) }))
}

// transactions: 월간 모드는 windowRange(12개월) 윈도우, 연간 모드는 yearsRange(limit년) 윈도우를
// 호출부가 각각 맞춰 넘긴다(타입 필터링만 된 상태). index로 거래를 rootId별로도 함께 집계한다.
export function calcFlowTrend(transactions: FinanceTransaction[], index: CategoryIndex, period: Period, limit = 6): FlowTrendPoint[] {
  return trendBuckets(period, limit).map(({ label, from, to }) => {
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
// (collectSubtreeIds가 예산 카테고리의 하위 트리 전체를 실적 집계에 포함하기 위해 필요).
// transactionsOfType: filterByType()로 같은 타입만 걸러진, 12개월 윈도우 전체 목록.
export function calcBudgetProgress(
  budgets: FinanceBudget[],
  transactionsOfType: FinanceTransaction[],
  categoryTree: FinanceCategory[],
  index: CategoryIndex,
  period: Period,
): BudgetProgress[] {
  const yearStart = `${period.month.slice(0, 4)}-01`
  const fromMonth = period.mode === 'yearly' ? yearStart : period.month
  const toMonth = period.month
  const { from, to } = periodRange(period)

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
  // 문제가 있었다(급여/상여 순서 흔들림).
  const displayOrder = flattenTreeIds(sortCategoryTree(categoryTree))
  return results.sort((a, b) => displayOrder.indexOf(a.categoryId) - displayOrder.indexOf(b.categoryId))
}
