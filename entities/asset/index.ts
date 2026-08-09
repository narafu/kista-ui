// entities/asset public API
export type { Asset, AssetCategory, AssetMonthlyCheck, AssetRequest } from './model/types'
export { assetKeys } from './model/queryKeys'
export { assetListQueryOptions, assetMonthlyChecksQueryOptions } from './model/queryOptions'
export {
  createAsset,
  deleteAsset,
  listAssetMonthlyChecks,
  listAssets,
  setAssetMonthlyCheck,
  updateAsset,
} from './api'
export { useAssetMonthlyChecksQuery, useAssetsQuery } from './hooks/useAssetQueries'
export {
  useCreateAssetMutation,
  useDeleteManyAssetsMutation,
  useSetAssetMonthlyCheckMutation,
  useUpdateAssetMutation,
} from './hooks/useAssetMutations'
export type { DeleteManyAssetsResult } from './hooks/useAssetMutations'
export {
  ASSET_CATEGORIES,
  KNOWN_ASSET_CLASSES,
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
