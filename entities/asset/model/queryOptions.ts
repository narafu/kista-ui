import { queryOptions } from '@tanstack/react-query'
import { listAssetMonthlyChecks, listAssets } from '../api'
import { assetKeys } from './queryKeys'
import type { Asset, AssetMonthlyCheck } from './types'

export function assetListQueryOptions(token?: string) {
  return queryOptions<Asset[]>({
    queryKey: assetKeys.list(),
    queryFn: () => listAssets(token),
  })
}

export function assetMonthlyChecksQueryOptions(token?: string) {
  return queryOptions<AssetMonthlyCheck[]>({
    queryKey: assetKeys.monthlyChecks(),
    queryFn: () => listAssetMonthlyChecks(token),
  })
}
