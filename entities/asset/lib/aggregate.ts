import { isLoanCategory } from '@shared/lib/api-schema'
import type { Asset, AssetCategory } from '../model/types'

export const ASSET_CATEGORIES: AssetCategory[] = ['INVESTMENT', 'SAVINGS', 'LOAN', 'REAL_ESTATE']

// 자산군은 자유 입력이라 고정 enum이 없다 — 알려진 순서를 우선 배치하고, 데이터에만 있는 값은 뒤에 이어붙인다.
export const KNOWN_ASSET_CLASSES = ['미국주식', '기타주식', '금/은', '크립토', '원화', '달러']

function sum(assets: Asset[]): number {
  return assets.reduce((total, asset) => total + asset.amount, 0)
}

function assetsInMonth(assets: Asset[], month: string): Asset[] {
  return assets.filter((asset) => asset.entryDate.startsWith(month))
}

export function listAvailableMonths(assets: Asset[]): string[] {
  const months = new Set(assets.map((asset) => asset.entryDate.slice(0, 7)))
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
export function calcMonthlySummary(assets: Asset[], month: string): MonthlySummary {
  const monthAssets = assetsInMonth(assets, month)
  const liabilities = monthAssets.filter((asset) => isLoanCategory(asset.category))
  const nonLiabilities = monthAssets.filter((asset) => !isLoanCategory(asset.category))
  const totalAssets = sum(nonLiabilities)
  const totalLiabilities = sum(liabilities)

  const amountByClass = new Map<string, number>()
  for (const asset of nonLiabilities) {
    amountByClass.set(asset.assetClass, (amountByClass.get(asset.assetClass) ?? 0) + asset.amount)
  }
  const largestEntry = [...amountByClass.entries()].sort((a, b) => b[1] - a[1])[0]

  return {
    netWorth: totalAssets - totalLiabilities,
    totalAssets,
    totalLiabilities,
    largestAssetClass: largestEntry ? { assetClass: largestEntry[0], amount: largestEntry[1] } : null,
    recordCount: monthAssets.length,
  }
}

export interface CategoryAmount {
  category: AssetCategory
  amount: number
}

export function calcCategoryBreakdown(assets: Asset[], month: string): CategoryAmount[] {
  const monthAssets = assetsInMonth(assets, month)
  return ASSET_CATEGORIES.map((category) => ({
    category,
    amount: sum(monthAssets.filter((asset) => asset.category === category)),
  }))
}

export interface AssetClassAmount {
  assetClass: string
  amount: number
}

// 미등록 자산군 누락 버그 수정 지점 — 알려진 순서 뒤에 데이터에만 존재하는 자산군을 이어붙인다.
export function calcAssetClassBreakdown(assets: Asset[], month: string): AssetClassAmount[] {
  const monthAssets = assetsInMonth(assets, month).filter((asset) => !isLoanCategory(asset.category))
  const amountByClass = new Map<string, number>()
  const order = [...KNOWN_ASSET_CLASSES]
  for (const asset of monthAssets) {
    if (!order.includes(asset.assetClass)) order.push(asset.assetClass)
    amountByClass.set(asset.assetClass, (amountByClass.get(asset.assetClass) ?? 0) + asset.amount)
  }
  return order
    .map((assetClass) => ({ assetClass, amount: amountByClass.get(assetClass) ?? 0 }))
    .filter((entry) => entry.amount > 0)
}

export type TrendMode = 'netWorth' | 'category' | 'assetClass'

export interface TrendPoint {
  month: string
  amount: number
}

export function calcMonthlyTrend(assets: Asset[], mode: TrendMode, selector: string | null, monthsLimit = 6): TrendPoint[] {
  const months = listAvailableMonths(assets).slice().sort() // 오름차순
  return months.slice(-monthsLimit).map((month) => {
    if (mode === 'netWorth') return { month, amount: calcMonthlySummary(assets, month).netWorth }
    const monthAssets = assetsInMonth(assets, month)
    if (mode === 'category') {
      return { month, amount: sum(monthAssets.filter((asset) => asset.category === selector)) }
    }
    const nonLiabilities = monthAssets.filter((asset) => !isLoanCategory(asset.category))
    return { month, amount: sum(nonLiabilities.filter((asset) => asset.assetClass === selector)) }
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
  assets: Asset[],
  items: string[],
  matcher: (asset: Asset, item: string) => boolean,
  monthsLimit = 6,
): CompositionColumn[] {
  const months = listAvailableMonths(assets).slice(0, monthsLimit).reverse() // 오름차순 최근 N개월
  return months.map((month) => {
    const monthAssets = assetsInMonth(assets, month)
    const entries = items.map((item) => ({
      item,
      amount: sum(monthAssets.filter((asset) => matcher(asset, item))),
    }))
    const total = entries.reduce((sumAmount, entry) => sumAmount + entry.amount, 0)
    return {
      month,
      entries: entries.map((entry) => ({ ...entry, percent: total ? (entry.amount / total) * 100 : 0 })),
      total,
    }
  })
}

export function calcCategoryComposition(assets: Asset[], monthsLimit = 6): CompositionColumn[] {
  return calcComposition(assets, ASSET_CATEGORIES, (asset, item) => asset.category === item, monthsLimit)
}

// calcAssetClassBreakdown과 동일하게 대출을 제외하고, 자유 입력한 미등록 자산군도 알려진 순서 뒤에 이어붙인다.
// KNOWN_ASSET_CLASSES만 items로 넘기면 미등록 자산군이 분자·분모 양쪽에서 통째로 빠져
// 나머지 항목의 비중이 부풀려지는 조용한 회귀가 생긴다(calcAssetClassBreakdown 누락 버그와 동일한 종류).
export function calcAssetClassComposition(assets: Asset[], monthsLimit = 6): CompositionColumn[] {
  const items = [...KNOWN_ASSET_CLASSES]
  for (const asset of assets) {
    if (!isLoanCategory(asset.category) && !items.includes(asset.assetClass)) items.push(asset.assetClass)
  }
  return calcComposition(
    assets,
    items,
    (asset, item) => !isLoanCategory(asset.category) && asset.assetClass === item,
    monthsLimit,
  )
}

// 계좌 식별용 — institution·subcategory·assetClass 조합. institution 미입력은 '기관 미입력'으로 표시.
function accountLabel(asset: Asset): string {
  return `${asset.institution || '기관 미입력'} · ${asset.subcategory} · ${asset.assetClass}`
}

export function calcMissingCategories(assets: Asset[], month: string): AssetCategory[] {
  const monthAssets = assetsInMonth(assets, month)
  const present = new Set(monthAssets.map((asset) => asset.category))
  return ASSET_CATEGORIES.filter((category) => !present.has(category))
}

export function calcMissingAccounts(assets: Asset[], month: string, previousMonth: string | null): string[] {
  if (!previousMonth) return []
  const currentAccounts = new Set(assetsInMonth(assets, month).map(accountLabel))
  const previousAccounts = new Set(assetsInMonth(assets, previousMonth).map(accountLabel))
  return Array.from(previousAccounts).filter((account) => !currentAccounts.has(account))
}

export interface DateGroup {
  date: string
  count: number
}

export function calcDateGroups(assets: Asset[], month: string): DateGroup[] {
  const counts = new Map<string, number>()
  for (const asset of assetsInMonth(assets, month)) {
    counts.set(asset.entryDate, (counts.get(asset.entryDate) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function previousMonthOf(months: string[], month: string): string | null {
  return months.filter((candidate) => candidate < month)[0] ?? null
}
