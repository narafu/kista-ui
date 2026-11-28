import { queryOptions } from '@tanstack/react-query'
import { keepPreviousData } from '@shared/lib/query'
import {
  getAssetCheck,
  getAssetComposition,
  getAssetSummary,
  getAssetTrend,
  getBudgetProgress,
  getBulkRegisterPreview,
  getFlowSummary,
  getFlowTrend,
  listAssetSnapshots,
  listFinanceAccounts,
  listFinanceBudgets,
  listFinanceCategories,
  listFinanceGroups,
  listFinanceTransactions,
  listMonthlyClosings,
} from '../api'
import { financeKeys } from './queryKeys'
import type { Period, TrendRange } from '../lib/period'
import type {
  AssetCheck,
  AssetComposition,
  AssetCompositionBasis,
  AssetSnapshot,
  AssetSummary,
  AssetTrend,
  BudgetProgress,
  BulkRegisterPreview,
  FinanceAccount,
  FinanceBudget,
  FinanceCategory,
  FinanceCategoryType,
  FinanceGroup,
  FinanceTransaction,
  FlowSummary,
  FlowTrend,
  MonthlyClosing,
} from './types'

export function assetSnapshotListQueryOptions(token?: string) {
  return queryOptions<AssetSnapshot[]>({
    queryKey: financeKeys.assetSnapshots(),
    queryFn: () => listAssetSnapshots(token),
  })
}

export function financeCategoryListQueryOptions(type: FinanceCategoryType, token?: string) {
  return queryOptions<FinanceCategory[]>({
    queryKey: financeKeys.categories(type),
    queryFn: () => listFinanceCategories(type, token),
  })
}

export function financeAccountListQueryOptions(token?: string) {
  return queryOptions<FinanceAccount[]>({
    queryKey: financeKeys.accounts(),
    queryFn: () => listFinanceAccounts(token),
  })
}

export function monthlyClosingListQueryOptions(token?: string) {
  return queryOptions<MonthlyClosing[]>({
    queryKey: financeKeys.monthlyClosings(),
    queryFn: () => listMonthlyClosings(token),
  })
}

export function financeGroupListQueryOptions(token?: string) {
  return queryOptions<FinanceGroup[]>({
    queryKey: financeKeys.groups(),
    queryFn: () => listFinanceGroups(token),
  })
}

// 거래 원본 목록 — 집계는 서버 엔드포인트(아래 서버 집계 queryOptions)가 하고, 이 목록은 내역 리스트·
// 자동 월 보정처럼 원본이 필요한 곳만 쓴다.
export function transactionListQueryOptions(from: string | undefined, to: string, token?: string) {
  return queryOptions<FinanceTransaction[]>({
    queryKey: financeKeys.transactions(from, to),
    queryFn: () => listFinanceTransactions({ from, to, token }),
  })
}

// date 파라미터 없이 전체 로드 — 예산 행 수가 적고 월 이동마다 재조회할 이유가 없다(예산 관리 화면용).
// 예산 대비 실적은 서버 집계(budgetProgressQueryOptions)가 한다.
export function budgetListQueryOptions(token?: string) {
  return queryOptions<FinanceBudget[]>({
    queryKey: financeKeys.budgets(),
    queryFn: () => listFinanceBudgets({ token }),
  })
}

// ── 서버 집계. TrendRange 'all'은 range·months를 생략해 서버가 전체 기간을 쓰게 한다.
// 집계 쿼리는 키(월·모드·기간)가 바뀌는 동안 이전 응답을 보여 카드가 로딩으로 깜빡이지 않게 한다 —
// 위젯의 로딩 판정(isLoading)은 placeholder가 있으면 false라 이전 값이 그대로 남는다.
function rangeParam(range: TrendRange): number | undefined {
  return range === 'all' ? undefined : range
}

// 연간 모드 집계는 서버(kista-api FlowPeriod)가 선택 연도만 쓴다(mm은 무시 — 기간은 1월~오늘/12월, 월평균
// 분모도 연도 기준). 월간 탭에서 보던 달이 남은 mm을 키·요청에서 지워 같은 연도의 중복 캐시를 없앤다.
function aggregatePeriod({ month, mode }: Period): Period {
  return mode === 'yearly' ? { month: `${month.slice(0, 4)}-01`, mode } : { month, mode }
}

// month 생략 = 서버가 최근 기록 월로 응답한다(자산 탭 기본 월).
export function assetSummaryQueryOptions(month?: string, token?: string) {
  return queryOptions<AssetSummary>({
    queryKey: financeKeys.assetSummary(month),
    queryFn: () => getAssetSummary(month, token),
    placeholderData: keepPreviousData,
  })
}

export function assetTrendQueryOptions(range: TrendRange, endMonth?: string) {
  const months = rangeParam(range)
  return queryOptions<AssetTrend>({
    queryKey: financeKeys.assetTrend(months, endMonth),
    queryFn: () => getAssetTrend({ months, endMonth }),
    placeholderData: keepPreviousData,
  })
}

export function assetCompositionQueryOptions(basis: AssetCompositionBasis, range: TrendRange, endMonth?: string) {
  const months = rangeParam(range)
  return queryOptions<AssetComposition>({
    queryKey: financeKeys.assetComposition(basis, months, endMonth),
    queryFn: () => getAssetComposition({ basis, months, endMonth }),
    placeholderData: keepPreviousData,
  })
}

export function assetCheckQueryOptions(month: string) {
  return queryOptions<AssetCheck>({
    queryKey: financeKeys.assetCheck(month),
    queryFn: () => getAssetCheck(month),
    placeholderData: keepPreviousData,
  })
}

export function flowSummaryQueryOptions(type: FinanceCategoryType, selected: Period) {
  const period = aggregatePeriod(selected)
  return queryOptions<FlowSummary>({
    queryKey: financeKeys.flowSummary(type, period),
    queryFn: () => getFlowSummary({ type, period }),
    placeholderData: keepPreviousData,
  })
}

export function flowTrendQueryOptions(type: FinanceCategoryType, selected: Period, range: TrendRange) {
  const period = aggregatePeriod(selected)
  const bucketCount = rangeParam(range)
  return queryOptions<FlowTrend>({
    queryKey: financeKeys.flowTrend(type, period, bucketCount),
    queryFn: () => getFlowTrend({ type, period, range: bucketCount }),
    placeholderData: keepPreviousData,
  })
}

export function budgetProgressQueryOptions(type: FinanceCategoryType, selected: Period) {
  const period = aggregatePeriod(selected)
  return queryOptions<BudgetProgress>({
    queryKey: financeKeys.budgetProgress(type, period),
    queryFn: () => getBudgetProgress({ type, period }),
    placeholderData: keepPreviousData,
  })
}

export function bulkRegisterPreviewQueryOptions(sourceMonth: string) {
  return queryOptions<BulkRegisterPreview>({
    queryKey: financeKeys.bulkRegisterPreview(sourceMonth),
    queryFn: () => getBulkRegisterPreview(sourceMonth),
    placeholderData: keepPreviousData,
  })
}
