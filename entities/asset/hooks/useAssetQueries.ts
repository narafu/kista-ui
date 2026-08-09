'use client'

import { useQuery } from '@tanstack/react-query'
import { assetListQueryOptions, assetMonthlyChecksQueryOptions } from '../model/queryOptions'

export function useAssetsQuery() {
  return useQuery(assetListQueryOptions())
}

export function useAssetMonthlyChecksQuery() {
  return useQuery(assetMonthlyChecksQueryOptions())
}
