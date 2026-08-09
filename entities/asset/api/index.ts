import { fetchEither, jsonBody } from '@shared/lib/api-client'
import type { Asset, AssetMonthlyCheck, AssetRequest } from '../model/types'

export async function listAssets(token?: string): Promise<Asset[]> {
  return fetchEither<Asset[]>('/api/assets', { method: 'GET' }, token)
}

export async function createAsset(data: AssetRequest, token?: string): Promise<Asset> {
  return fetchEither<Asset>('/api/assets', jsonBody('POST', data), token)
}

export async function updateAsset(id: string, data: AssetRequest, token?: string): Promise<Asset> {
  return fetchEither<Asset>(`/api/assets/${id}`, jsonBody('PUT', data), token)
}

export async function deleteAsset(id: string, token?: string): Promise<void> {
  return fetchEither<void>(`/api/assets/${id}`, { method: 'DELETE' }, token)
}

export async function listAssetMonthlyChecks(token?: string): Promise<AssetMonthlyCheck[]> {
  return fetchEither<AssetMonthlyCheck[]>('/api/asset-monthly-checks', { method: 'GET' }, token)
}

export async function setAssetMonthlyCheck(month: string, completed: boolean, token?: string): Promise<AssetMonthlyCheck> {
  return fetchEither<AssetMonthlyCheck>(
    `/api/asset-monthly-checks/${month}`,
    jsonBody('PUT', { completed }),
    token,
  )
}
