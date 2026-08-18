import type { AssetClass, AssetSnapshot } from '../model/types'

// finance_categories 자산(ASSET) L1은 고정 UUID 시스템 시드다(kista-api V13 시드값과 동일, 수정·삭제 불가).
// 구 AssetCategory enum(INVESTMENT/SAVINGS/LOAN/REAL_ESTATE)의 후계 — 같은 순서를 유지해 정렬·색상
// 인덱스가 그대로 이어지게 한다.
export const SYSTEM_INVESTMENT_CATEGORY_ID = 'f1000000-0000-4000-8000-000000000403'
export const SYSTEM_SAVINGS_CATEGORY_ID = 'f1000000-0000-4000-8000-000000000401'
export const SYSTEM_LOAN_CATEGORY_ID = 'f1000000-0000-4000-8000-000000000404'
export const SYSTEM_REAL_ESTATE_CATEGORY_ID = 'f1000000-0000-4000-8000-000000000402'

export const ASSET_L1_CATEGORY_IDS = [
  SYSTEM_INVESTMENT_CATEGORY_ID,
  SYSTEM_SAVINGS_CATEGORY_ID,
  SYSTEM_LOAN_CATEGORY_ID,
  SYSTEM_REAL_ESTATE_CATEGORY_ID,
]

// L1은 시스템 카테고리라 이름 변경이 불가하다(kista-api FinanceCategory.isSystem() → 수정 403) —
// breakdown/composition처럼 categoryName이 실려오지 않는 집계 결과를 위해 이름을 직접 들고 있는다.
// 구 formatAssetCategoryLabel(ASSET_CATEGORY_LABEL)의 후계.
const ASSET_L1_CATEGORY_LABEL: Record<string, string> = {
  [SYSTEM_INVESTMENT_CATEGORY_ID]: '투자',
  [SYSTEM_SAVINGS_CATEGORY_ID]: '예적금',
  [SYSTEM_LOAN_CATEGORY_ID]: '대출',
  [SYSTEM_REAL_ESTATE_CATEGORY_ID]: '부동산',
}

export function formatAssetL1CategoryLabel(categoryId: string): string {
  return ASSET_L1_CATEGORY_LABEL[categoryId] ?? categoryId
}

// AssetClass는 서버 enum(닫힌 6값)이라 구 KNOWN_ASSET_CLASSES의 "미등록 값은 뒤에 이어붙이기" 방어가 불필요하다.
export const ASSET_CLASS_ORDER: AssetClass[] = ['CASH', 'EQUITY', 'FIXED_INCOME', 'COMMODITY', 'CRYPTO', 'REAL_ESTATE']

// 대출 판정 — kista-api AssetSnapshotController.enrich()가 rootCategoryId를 임의 depth를 거슬러 올라가
// 진짜 트리 루트(L1)로 채우므로, L1(대출)에 직접 등록한 기록도 self로 떨어져 이 비교가 성립한다.
// 문자열 비교 대신 이 함수를 통해서만 판정한다.
export function isLiability(snapshot: AssetSnapshot): boolean {
  return snapshot.rootCategoryId === SYSTEM_LOAN_CATEGORY_ID
}

function sum(snapshots: AssetSnapshot[]): number {
  return snapshots.reduce((total, snapshot) => total + snapshot.amount, 0)
}

function snapshotsInMonth(snapshots: AssetSnapshot[], month: string): AssetSnapshot[] {
  return snapshots.filter((snapshot) => snapshot.entryDate.startsWith(month))
}

export function listAvailableMonths(snapshots: AssetSnapshot[]): string[] {
  const months = new Set(snapshots.map((snapshot) => snapshot.entryDate.slice(0, 7)))
  return Array.from(months).sort().reverse()
}

export interface MonthlySummary {
  netWorth: number
  totalAssets: number
  totalLiabilities: number
  largestAssetClass: { assetClass: string; amount: number } | null
  recordCount: number
}

// 순자산 = 총자산(대출 제외) - 총부채(대출) — 레퍼런스는 sum(전체)-sum(대출)로 계산해 결과가 항상 totalAssets와 같아지는 버그가 있었다.
export function calcMonthlySummary(snapshots: AssetSnapshot[], month: string): MonthlySummary {
  const monthSnapshots = snapshotsInMonth(snapshots, month)
  const liabilities = monthSnapshots.filter(isLiability)
  const nonLiabilities = monthSnapshots.filter((snapshot) => !isLiability(snapshot))
  const totalAssets = sum(nonLiabilities)
  const totalLiabilities = sum(liabilities)

  const amountByClass = new Map<string, number>()
  for (const snapshot of nonLiabilities) {
    amountByClass.set(snapshot.assetClass, (amountByClass.get(snapshot.assetClass) ?? 0) + snapshot.amount)
  }
  const largestEntry = [...amountByClass.entries()].sort((a, b) => b[1] - a[1])[0]

  return {
    netWorth: totalAssets - totalLiabilities,
    totalAssets,
    totalLiabilities,
    largestAssetClass: largestEntry ? { assetClass: largestEntry[0], amount: largestEntry[1] } : null,
    recordCount: monthSnapshots.length,
  }
}

export interface CategoryAmount {
  category: string // L1 카테고리 ID
  amount: number
}

export function calcCategoryBreakdown(snapshots: AssetSnapshot[], month: string): CategoryAmount[] {
  const monthSnapshots = snapshotsInMonth(snapshots, month)
  return ASSET_L1_CATEGORY_IDS.map((category) => ({
    category,
    amount: sum(monthSnapshots.filter((snapshot) => snapshot.rootCategoryId === category)),
  }))
}

export interface AssetClassAmount {
  assetClass: string
  amount: number
}

export function calcAssetClassBreakdown(snapshots: AssetSnapshot[], month: string): AssetClassAmount[] {
  const monthSnapshots = snapshotsInMonth(snapshots, month).filter((snapshot) => !isLiability(snapshot))
  const amountByClass = new Map<string, number>()
  for (const snapshot of monthSnapshots) {
    amountByClass.set(snapshot.assetClass, (amountByClass.get(snapshot.assetClass) ?? 0) + snapshot.amount)
  }
  return ASSET_CLASS_ORDER
    .map((assetClass) => ({ assetClass, amount: amountByClass.get(assetClass) ?? 0 }))
    .filter((entry) => entry.amount > 0)
}

export type TrendMode = 'netWorth' | 'category' | 'assetClass'

export interface TrendPoint {
  month: string
  amount: number
}

export function calcMonthlyTrend(
  snapshots: AssetSnapshot[],
  mode: TrendMode,
  selector: string | null,
  monthsLimit = 6,
): TrendPoint[] {
  const months = listAvailableMonths(snapshots).slice().sort() // 오름차순
  return months.slice(-monthsLimit).map((month) => {
    if (mode === 'netWorth') return { month, amount: calcMonthlySummary(snapshots, month).netWorth }
    const monthSnapshots = snapshotsInMonth(snapshots, month)
    if (mode === 'category') {
      return { month, amount: sum(monthSnapshots.filter((snapshot) => snapshot.rootCategoryId === selector)) }
    }
    const nonLiabilities = monthSnapshots.filter((snapshot) => !isLiability(snapshot))
    return { month, amount: sum(nonLiabilities.filter((snapshot) => snapshot.assetClass === selector)) }
  })
}

export interface CompositionEntry {
  item: string
  amount: number
  percent: number
}

export interface CompositionColumn {
  month: string
  entries: CompositionEntry[]
  total: number
}

// 범용 구성비 계산 — 카테고리 구성비는 대출을 포함(레퍼런스와 동일하게 4개 세그먼트로 표시)해야 하므로
// 대출 제외 여부를 matcher에 맡긴다. 자산군 구성비처럼 대출을 빼야 하는 호출부는 matcher에서 직접 걸러야 한다
// (아래 calcCategoryComposition/calcAssetClassComposition처럼 전용 래퍼를 통해서만 호출할 것 — 직접 호출 시 대출 제외를 빠뜨리기 쉽다).
export function calcComposition(
  snapshots: AssetSnapshot[],
  items: string[],
  matcher: (snapshot: AssetSnapshot, item: string) => boolean,
  monthsLimit = 6,
): CompositionColumn[] {
  const months = listAvailableMonths(snapshots).slice(0, monthsLimit).reverse() // 오름차순 최근 N개월
  return months.map((month) => {
    const monthSnapshots = snapshotsInMonth(snapshots, month)
    const entries = items.map((item) => ({
      item,
      amount: sum(monthSnapshots.filter((snapshot) => matcher(snapshot, item))),
    }))
    const total = entries.reduce((sumAmount, entry) => sumAmount + entry.amount, 0)
    return {
      month,
      entries: entries.map((entry) => ({ ...entry, percent: total ? (entry.amount / total) * 100 : 0 })),
      total,
    }
  })
}

export function calcCategoryComposition(snapshots: AssetSnapshot[], monthsLimit = 6): CompositionColumn[] {
  return calcComposition(
    snapshots,
    ASSET_L1_CATEGORY_IDS,
    (snapshot, item) => snapshot.rootCategoryId === item,
    monthsLimit,
  )
}

export function calcAssetClassComposition(snapshots: AssetSnapshot[], monthsLimit = 6): CompositionColumn[] {
  return calcComposition(
    snapshots,
    ASSET_CLASS_ORDER,
    (snapshot, item) => !isLiability(snapshot) && snapshot.assetClass === item,
    monthsLimit,
  )
}

// 계좌 식별용 — 계좌명·카테고리명·자산군 조합. 계좌 미연결(전세임차보증금 등)은 '계좌 미지정'으로 표시.
function accountLabel(snapshot: AssetSnapshot): string {
  return `${snapshot.accountName ?? '계좌 미지정'} · ${snapshot.categoryName} · ${snapshot.assetClass}`
}

export function calcMissingCategories(snapshots: AssetSnapshot[], month: string): string[] {
  const monthSnapshots = snapshotsInMonth(snapshots, month)
  const present = new Set(monthSnapshots.map((snapshot) => snapshot.rootCategoryId))
  return ASSET_L1_CATEGORY_IDS.filter((category) => !present.has(category))
}

export function calcMissingAccounts(snapshots: AssetSnapshot[], month: string, previousMonth: string | null): string[] {
  if (!previousMonth) return []
  const currentAccounts = new Set(snapshotsInMonth(snapshots, month).map(accountLabel))
  const previousAccounts = new Set(snapshotsInMonth(snapshots, previousMonth).map(accountLabel))
  return Array.from(previousAccounts).filter((account) => !currentAccounts.has(account))
}

export interface DateGroup {
  date: string
  count: number
}

export function calcDateGroups(snapshots: AssetSnapshot[], month: string): DateGroup[] {
  const counts = new Map<string, number>()
  for (const snapshot of snapshotsInMonth(snapshots, month)) {
    counts.set(snapshot.entryDate, (counts.get(snapshot.entryDate) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function previousMonthOf(months: string[], month: string): string | null {
  return months.filter((candidate) => candidate < month)[0] ?? null
}
