import { fetchEither, jsonBody } from '@shared/lib/api-client'
import type {
  AssetSnapshot,
  AssetSnapshotRequest,
  FinanceAccount,
  FinanceAccountRequest,
  FinanceCategory,
  FinanceCategoryRequest,
  FinanceCategoryType,
  FinanceGroup,
  FinanceGroupInvitation,
  FinanceGroupMember,
  MonthlyClosing,
} from '../model/types'

// groupId 미지정 시 서버는 호출자의 개인 그룹으로 스코프한다. groupId·token을 함께 받는
// 함수들이 포지셔널 인자 순서에 의존하지 않도록 이 named-params 객체로 통일한다.
export interface GroupScopedOptions {
  groupId?: string
  token?: string
}

function withQuery(path: string, params: Record<string, string | undefined>) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value)
  }
  const qs = query.toString()
  return qs ? `${path}?${qs}` : path
}

export async function listAssetSnapshots({ groupId, token }: GroupScopedOptions = {}): Promise<AssetSnapshot[]> {
  return fetchEither<AssetSnapshot[]>(withQuery('/api/finance/asset-snapshots', { groupId }), { method: 'GET' }, token)
}

export async function createAssetSnapshot(
  data: AssetSnapshotRequest,
  { groupId, token }: GroupScopedOptions = {},
): Promise<AssetSnapshot> {
  return fetchEither<AssetSnapshot>(withQuery('/api/finance/asset-snapshots', { groupId }), jsonBody('POST', data), token)
}

export async function updateAssetSnapshot(
  id: string,
  data: AssetSnapshotRequest,
  token?: string,
): Promise<AssetSnapshot> {
  return fetchEither<AssetSnapshot>(`/api/finance/asset-snapshots/${encodeURIComponent(id)}`, jsonBody('PUT', data), token)
}

export async function deleteAssetSnapshot(id: string, token?: string): Promise<void> {
  return fetchEither<void>(`/api/finance/asset-snapshots/${encodeURIComponent(id)}`, { method: 'DELETE' }, token)
}

export async function listFinanceCategories(
  type: FinanceCategoryType,
  { groupId, token }: GroupScopedOptions = {},
): Promise<FinanceCategory[]> {
  return fetchEither<FinanceCategory[]>(
    withQuery('/api/finance/categories', { type, groupId }),
    { method: 'GET' },
    token,
  )
}

export async function createFinanceCategory(
  data: FinanceCategoryRequest,
  { groupId, token }: GroupScopedOptions = {},
): Promise<FinanceCategory> {
  return fetchEither<FinanceCategory>(withQuery('/api/finance/categories', { groupId }), jsonBody('POST', data), token)
}

// PUT은 parentId/type을 무시한다(kista-api FinanceCategoryService.update) — 이름·sortOrder만 반영됨, 카테고리 이동 불가.
export async function updateFinanceCategory(
  id: string,
  data: FinanceCategoryRequest,
  token?: string,
): Promise<FinanceCategory> {
  return fetchEither<FinanceCategory>(`/api/finance/categories/${encodeURIComponent(id)}`, jsonBody('PUT', data), token)
}

export async function deleteFinanceCategory(id: string, token?: string): Promise<void> {
  return fetchEither<void>(`/api/finance/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }, token)
}

// 관리자 전용 시스템(공통) 카테고리 CRUD — groupId 없이 항상 system:true로 생성된다.
// /api/admin/** 는 app/api/admin/[[...path]]/route.ts가 그대로 프록시하며 kista-api가 서버에서 ADMIN role을 검증한다.
export async function listSystemFinanceCategories(type: FinanceCategoryType, token?: string): Promise<FinanceCategory[]> {
  return fetchEither<FinanceCategory[]>(withQuery('/api/admin/finance/categories', { type }), { method: 'GET' }, token)
}

export async function createSystemFinanceCategory(data: FinanceCategoryRequest, token?: string): Promise<FinanceCategory> {
  return fetchEither<FinanceCategory>('/api/admin/finance/categories', jsonBody('POST', data), token)
}

// PUT은 parentId/type을 무시한다(kista-api FinanceCategoryService.updateSystem) — 이름·sortOrder만 반영됨.
export async function updateSystemFinanceCategory(
  id: string,
  data: FinanceCategoryRequest,
  token?: string,
): Promise<FinanceCategory> {
  return fetchEither<FinanceCategory>(`/api/admin/finance/categories/${encodeURIComponent(id)}`, jsonBody('PUT', data), token)
}

export async function deleteSystemFinanceCategory(id: string, token?: string): Promise<void> {
  return fetchEither<void>(`/api/admin/finance/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }, token)
}

export async function listFinanceAccounts({ groupId, token }: GroupScopedOptions = {}): Promise<FinanceAccount[]> {
  return fetchEither<FinanceAccount[]>(withQuery('/api/finance/accounts', { groupId }), { method: 'GET' }, token)
}

export async function createFinanceAccount(
  data: FinanceAccountRequest,
  { groupId, token }: GroupScopedOptions = {},
): Promise<FinanceAccount> {
  return fetchEither<FinanceAccount>(withQuery('/api/finance/accounts', { groupId }), jsonBody('POST', data), token)
}

export async function updateFinanceAccount(id: string, data: FinanceAccountRequest, token?: string): Promise<FinanceAccount> {
  return fetchEither<FinanceAccount>(`/api/finance/accounts/${encodeURIComponent(id)}`, jsonBody('PUT', data), token)
}

export async function deleteFinanceAccount(id: string, token?: string): Promise<void> {
  return fetchEither<void>(`/api/finance/accounts/${encodeURIComponent(id)}`, { method: 'DELETE' }, token)
}

export async function listMonthlyClosings({ groupId, token }: GroupScopedOptions = {}): Promise<MonthlyClosing[]> {
  return fetchEither<MonthlyClosing[]>(withQuery('/api/finance/monthly-closings', { groupId }), { method: 'GET' }, token)
}

export async function setMonthlyClosing(month: string, completed: boolean, token?: string): Promise<MonthlyClosing> {
  return fetchEither<MonthlyClosing>(
    `/api/finance/monthly-closings/${encodeURIComponent(month)}`,
    jsonBody('PATCH', { completed }),
    token,
  )
}

export async function listFinanceGroups(token?: string): Promise<FinanceGroup[]> {
  return fetchEither<FinanceGroup[]>('/api/finance/groups', { method: 'GET' }, token)
}

export async function listFinanceGroupMembers(groupId: string, token?: string): Promise<FinanceGroupMember[]> {
  return fetchEither<FinanceGroupMember[]>(`/api/finance/groups/${encodeURIComponent(groupId)}/members`, { method: 'GET' }, token)
}

export async function removeFinanceGroupMember(groupId: string, userId: string, token?: string): Promise<void> {
  return fetchEither<void>(
    `/api/finance/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
    { method: 'DELETE' },
    token,
  )
}

export async function createFinanceGroupInvitation(
  groupId: string,
  expiresInHours: number,
  token?: string,
): Promise<FinanceGroupInvitation> {
  return fetchEither<FinanceGroupInvitation>(
    `/api/finance/groups/${encodeURIComponent(groupId)}/invitations`,
    jsonBody('POST', { expiresInHours }),
    token,
  )
}

// code는 사용자가 붙여넣는 자유 입력이라(초대 코드 입력 폼) URL path 세그먼트로 쓰기 전
// 반드시 인코딩한다 — 그대로 넣으면 '#'·'/' 등이 포함된 값이 잘못된 경로로 잘린다.
export async function respondToInvitation(
  code: string,
  status: 'ACCEPTED' | 'DECLINED',
  token?: string,
): Promise<FinanceGroup> {
  return fetchEither<FinanceGroup>(`/api/finance/invitations/${encodeURIComponent(code)}`, jsonBody('PATCH', { status }), token)
}
