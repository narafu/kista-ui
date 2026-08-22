import { fetchEither, jsonBody } from '@shared/lib/api-client'
import type {
  AssetSnapshot,
  AssetSnapshotRequest,
  FinanceAccount,
  FinanceAccountRequest,
  FinanceBudget,
  FinanceBudgetRequest,
  FinanceCategory,
  FinanceCategoryRequest,
  FinanceCategoryType,
  FinanceGroup,
  FinanceGroupInvitation,
  FinanceGroupMember,
  FinanceTransaction,
  FinanceTransactionRequest,
  MonthlyClosing,
} from '../model/types'

// FinanceTransactionResponse/FinanceBudgetResponse는 openapi 스펙상 amount에 required 표시가 없다 —
// 서버가 실제로 누락시키진 않지만 방어적으로 API 경계에서 0으로 정규화한다(폼 쪽 필수 검증과는 별개).
function normalizeTransaction(t: FinanceTransaction): FinanceTransaction {
  return { ...t, amount: t.amount ?? 0 }
}
function normalizeBudget(b: FinanceBudget): FinanceBudget {
  return { ...b, amount: b.amount ?? 0 }
}

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

export interface TransactionListOptions extends GroupScopedOptions {
  from?: string
  to?: string
  categoryId?: string
  userId?: string
}

export async function listFinanceTransactions({
  groupId,
  token,
  from,
  to,
  categoryId,
  userId,
}: TransactionListOptions = {}): Promise<FinanceTransaction[]> {
  const list = await fetchEither<FinanceTransaction[]>(
    withQuery('/api/finance/transactions', { groupId, from, to, categoryId, userId }),
    { method: 'GET' },
    token,
  )
  return list.map(normalizeTransaction)
}

export async function createFinanceTransaction(
  data: FinanceTransactionRequest,
  { groupId, token }: GroupScopedOptions = {},
): Promise<FinanceTransaction> {
  const saved = await fetchEither<FinanceTransaction>(
    withQuery('/api/finance/transactions', { groupId }),
    jsonBody('POST', data),
    token,
  )
  return normalizeTransaction(saved)
}

export async function updateFinanceTransaction(
  id: string,
  data: FinanceTransactionRequest,
  token?: string,
): Promise<FinanceTransaction> {
  const saved = await fetchEither<FinanceTransaction>(
    `/api/finance/transactions/${encodeURIComponent(id)}`,
    jsonBody('PUT', data),
    token,
  )
  return normalizeTransaction(saved)
}

export async function deleteFinanceTransaction(id: string, token?: string): Promise<void> {
  return fetchEither<void>(`/api/finance/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' }, token)
}

// 개인 소유 거래내역을 소유자의 현재 그룹으로 공유 전환한다(본인 소유·그룹 소속 상태에서만 성공).
export async function shareFinanceTransaction(id: string, token?: string): Promise<FinanceTransaction> {
  const saved = await fetchEither<FinanceTransaction>(
    `/api/finance/transactions/${encodeURIComponent(id)}/share`,
    { method: 'PATCH' },
    token,
  )
  return normalizeTransaction(saved)
}

// 그룹 공유 거래내역을 개인 소유로 되돌린다(같은 그룹 멤버면 누구든 가능, 이미 개인 소유면 멱등).
export async function unshareFinanceTransaction(id: string, token?: string): Promise<FinanceTransaction> {
  const saved = await fetchEither<FinanceTransaction>(
    `/api/finance/transactions/${encodeURIComponent(id)}/unshare`,
    { method: 'PATCH' },
    token,
  )
  return normalizeTransaction(saved)
}

export interface BudgetListOptions extends GroupScopedOptions {
  categoryId?: string
  date?: string
}

export async function listFinanceBudgets({ groupId, token, categoryId, date }: BudgetListOptions = {}): Promise<FinanceBudget[]> {
  const list = await fetchEither<FinanceBudget[]>(
    withQuery('/api/finance/budgets', { groupId, categoryId, date }),
    { method: 'GET' },
    token,
  )
  return list.map(normalizeBudget)
}

export async function createFinanceBudget(
  data: FinanceBudgetRequest,
  { groupId, token }: GroupScopedOptions = {},
): Promise<FinanceBudget> {
  const saved = await fetchEither<FinanceBudget>(withQuery('/api/finance/budgets', { groupId }), jsonBody('POST', data), token)
  return normalizeBudget(saved)
}

export async function updateFinanceBudget(id: string, data: FinanceBudgetRequest, token?: string): Promise<FinanceBudget> {
  const saved = await fetchEither<FinanceBudget>(`/api/finance/budgets/${encodeURIComponent(id)}`, jsonBody('PUT', data), token)
  return normalizeBudget(saved)
}

export async function deleteFinanceBudget(id: string, token?: string): Promise<void> {
  return fetchEither<void>(`/api/finance/budgets/${encodeURIComponent(id)}`, { method: 'DELETE' }, token)
}

// 개인 소유 예산을 소유자의 현재 그룹으로 공유 전환한다(본인 소유·그룹 소속 상태에서만 성공).
export async function shareFinanceBudget(id: string, token?: string): Promise<FinanceBudget> {
  const saved = await fetchEither<FinanceBudget>(`/api/finance/budgets/${encodeURIComponent(id)}/share`, { method: 'PATCH' }, token)
  return normalizeBudget(saved)
}

// 그룹 공유 예산을 개인 소유로 되돌린다(같은 그룹 멤버면 누구든 가능, 이미 개인 소유면 멱등).
export async function unshareFinanceBudget(id: string, token?: string): Promise<FinanceBudget> {
  const saved = await fetchEither<FinanceBudget>(`/api/finance/budgets/${encodeURIComponent(id)}/unshare`, { method: 'PATCH' }, token)
  return normalizeBudget(saved)
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
