import { fetchEither, jsonBody } from '@shared/lib/api-client'
import type { AssetSnapshot, AssetSnapshotRequest, FinanceAccount, FinanceCategory, MonthlyClosing } from '../model/types'

export async function listAssetSnapshots(token?: string): Promise<AssetSnapshot[]> {
  return fetchEither<AssetSnapshot[]>('/api/finance/asset-snapshots', { method: 'GET' }, token)
}

export async function createAssetSnapshot(data: AssetSnapshotRequest, token?: string): Promise<AssetSnapshot> {
  return fetchEither<AssetSnapshot>('/api/finance/asset-snapshots', jsonBody('POST', data), token)
}

export async function updateAssetSnapshot(
  id: string,
  data: AssetSnapshotRequest,
  token?: string,
): Promise<AssetSnapshot> {
  return fetchEither<AssetSnapshot>(`/api/finance/asset-snapshots/${id}`, jsonBody('PUT', data), token)
}

export async function deleteAssetSnapshot(id: string, token?: string): Promise<void> {
  return fetchEither<void>(`/api/finance/asset-snapshots/${id}`, { method: 'DELETE' }, token)
}

// type=ASSET만 사용 — 예산/거래내역(INCOME/EXPENSE/SAVING)은 후속 범위
export async function listFinanceCategories(token?: string): Promise<FinanceCategory[]> {
  return fetchEither<FinanceCategory[]>('/api/finance/categories?type=ASSET', { method: 'GET' }, token)
}

export async function listFinanceAccounts(token?: string): Promise<FinanceAccount[]> {
  return fetchEither<FinanceAccount[]>('/api/finance/accounts', { method: 'GET' }, token)
}

export async function listMonthlyClosings(token?: string): Promise<MonthlyClosing[]> {
  return fetchEither<MonthlyClosing[]>('/api/finance/monthly-closings', { method: 'GET' }, token)
}

export async function setMonthlyClosing(month: string, completed: boolean, token?: string): Promise<MonthlyClosing> {
  return fetchEither<MonthlyClosing>(
    `/api/finance/monthly-closings/${month}`,
    jsonBody('PATCH', { completed }),
    token,
  )
}
