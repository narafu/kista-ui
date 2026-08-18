// entities/finance public API
export type {
  AssetClass,
  AssetSnapshot,
  AssetSnapshotRequest,
  FinanceAccount,
  FinanceAccountType,
  FinanceCategory,
  FinanceCategoryType,
  Market,
  MonthlyClosing,
} from './model/types'
export { financeKeys } from './model/queryKeys'
export {
  assetSnapshotListQueryOptions,
  financeAccountListQueryOptions,
  financeCategoryListQueryOptions,
  monthlyClosingListQueryOptions,
} from './model/queryOptions'
export {
  createAssetSnapshot,
  deleteAssetSnapshot,
  listAssetSnapshots,
  listFinanceAccounts,
  listFinanceCategories,
  listMonthlyClosings,
  setMonthlyClosing,
  updateAssetSnapshot,
} from './api'
export {
  useAssetSnapshotsQuery,
  useFinanceAccountsQuery,
  useFinanceCategoriesQuery,
  useMonthlyClosingsQuery,
} from './hooks/useFinanceQueries'
export {
  useCreateAssetSnapshotMutation,
  useDeleteManyAssetSnapshotsMutation,
  useSetMonthlyClosingMutation,
  useUpdateAssetSnapshotMutation,
} from './hooks/useFinanceMutations'
export type { DeleteManyAssetSnapshotsResult } from './hooks/useFinanceMutations'
export { assetCategoryColor, assetClassColor } from './lib/colors'
export {
  ASSET_CLASS_ORDER,
  ASSET_L1_CATEGORY_IDS,
  SYSTEM_INVESTMENT_CATEGORY_ID,
  SYSTEM_LOAN_CATEGORY_ID,
  SYSTEM_REAL_ESTATE_CATEGORY_ID,
  SYSTEM_SAVINGS_CATEGORY_ID,
  calcAssetClassBreakdown,
  calcAssetClassComposition,
  calcCategoryBreakdown,
  calcCategoryComposition,
  calcComposition,
  calcDateGroups,
  calcMissingAccounts,
  calcMissingCategories,
  calcMonthlySummary,
  calcMonthlyTrend,
  formatAssetL1CategoryLabel,
  isLiability,
  listAvailableMonths,
  previousMonthOf,
} from './lib/aggregate'
export type {
  AssetClassAmount,
  CategoryAmount,
  CompositionColumn,
  CompositionEntry,
  DateGroup,
  MonthlySummary,
  TrendMode,
  TrendPoint,
} from './lib/aggregate'
export { flattenFinanceCategories } from './lib/categoryTree'
export type { FlatFinanceCategory } from './lib/categoryTree'
