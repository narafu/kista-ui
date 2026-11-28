import { fetchEither, jsonBody } from '@shared/lib/api-client'
import { buildQueryString } from '@shared/lib/query-string'
import type { components } from '@shared/lib/api-types'
import type { Period } from '../lib/period'
import type {
  AssetCheck,
  AssetClass,
  AssetComposition,
  AssetCompositionBasis,
  AssetSnapshot,
  AssetSnapshotRequest,
  AssetSummary,
  AssetTrend,
  BudgetProgress,
  BulkFinanceRegisterRequest,
  BulkFinanceRegisterResponse,
  BulkRegisterPreview,
  CategoryGroupNode,
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
  FinanceTransactionPage,
  FinanceTransactionRequest,
  FlowSummary,
  FlowTrend,
  Market,
  MonthlyClosing,
} from '../model/types'

// FinanceTransactionResponse/FinanceBudgetResponse는 openapi 스펙상 amount에 required 표시가 없다 —
// 서버가 실제로 누락시키진 않지만 방어적으로 API 경계에서 0으로 정규화한다(폼 쪽 필수 검증과는 별개).
function withDefaultAmount<T extends { amount: number }>(x: T): T {
  return { ...x, amount: x.amount ?? 0 }
}

// 목록 응답 봉투 — 생성 스키마(Items*Response)는 nullable이 null이라 손으로 둔 도메인 타입으로 푼다.
type Items<T> = { items: T[] }

async function listItems<T>(path: string, token?: string): Promise<T[]> {
  return (await fetchEither<Items<T>>(path, { method: 'GET' }, token)).items
}

function withQuery(path: string, params: Record<string, string | number | undefined>) {
  return path + buildQueryString(params)
}

// create* 6곳이 공유하는 { shareToGroup: 'true' | undefined } 쿼리 파라미터 조립.
function shareToGroupQuery(shareToGroup?: boolean) {
  return { shareToGroup: shareToGroup ? 'true' : undefined }
}

// share/unshare는 모든 finance 리소스에서 `PATCH {basePath}/{id}/{share|unshare}` 형태로 동일하다.
function shareToggle<T>(basePath: string, action: 'share' | 'unshare', id: string, token?: string): Promise<T> {
  return fetchEither<T>(`${basePath}/${encodeURIComponent(id)}/${action}`, { method: 'PATCH' }, token)
}

// 목록 조회는 그룹을 지정하지 않는다 — 서버가 호출자의 실제 소속 그룹(없으면 개인)으로 스코프한다.
// month('YYYY-MM') 필수 — 서버가 그 달 기록 전량만 준다(월 없이 호출하면 400).
export async function listAssetSnapshots({ month, token }: { month: string; token?: string }): Promise<AssetSnapshot[]> {
  return listItems<AssetSnapshot>(withQuery('/api/finance/asset-snapshots', { month }), token)
}

// shareToGroup:true면 서버가 호출자의 현재 그룹 소유로 원자적으로 생성한다(budget/transaction/account/
// category 공통 — 대상 그룹은 서버가 userId로 해석, 클라가 groupId를 보내지 않는다). 무그룹 상태에서
// shareToGroup:true면 서버가 400.
export async function createAssetSnapshot(
  data: AssetSnapshotRequest,
  { shareToGroup, token }: { shareToGroup?: boolean; token?: string } = {},
): Promise<AssetSnapshot> {
  return fetchEither<AssetSnapshot>(
    withQuery('/api/finance/asset-snapshots', shareToGroupQuery(shareToGroup)),
    jsonBody('POST', data),
    token,
  )
}

export async function updateAssetSnapshot(
  id: string,
  data: AssetSnapshotRequest,
  token?: string,
): Promise<AssetSnapshot> {
  return fetchEither<AssetSnapshot>(`/api/finance/asset-snapshots/${encodeURIComponent(id)}`, jsonBody('PUT', data), token)
}

// 개인 소유 자산 기록을 소유자의 현재 그룹으로 공유 전환한다(본인 소유·그룹 소속 상태에서만 성공).
export async function shareAssetSnapshot(id: string, token?: string): Promise<AssetSnapshot> {
  return shareToggle<AssetSnapshot>('/api/finance/asset-snapshots', 'share', id, token)
}

// 그룹 공유 자산 기록을 개인 소유로 되돌린다(같은 그룹 멤버면 누구든 가능, 이미 개인 소유면 멱등).
export async function unshareAssetSnapshot(id: string, token?: string): Promise<AssetSnapshot> {
  return shareToggle<AssetSnapshot>('/api/finance/asset-snapshots', 'unshare', id, token)
}

export async function deleteAssetSnapshot(id: string, token?: string): Promise<void> {
  return fetchEither<void>(`/api/finance/asset-snapshots/${encodeURIComponent(id)}`, { method: 'DELETE' }, token)
}

// 순수 flat 배치 등록 — 항목별 성공/실패를 응답으로 구분 반환한다(한 항목 실패가 전체를 막지 않음).
// shareToGroup:true면 서버가 각 항목 생성 직후 호출자의 현재 그룹으로 공유 전환한다 — 전환 실패
// 항목은 방금 만든 개인 레코드를 롤백하고 failures로 카운트한다(성공 카운트에서 빠짐). 대상 그룹은
// 서버가 userId로 해석하므로(단건 PATCH .../{id}/share와 동일) 클라이언트가 groupId를 지정하지 않는다.
export async function bulkRegisterFinance(
  data: BulkFinanceRegisterRequest,
  { shareToGroup, token }: { shareToGroup?: boolean; token?: string } = {},
): Promise<BulkFinanceRegisterResponse> {
  return fetchEither<BulkFinanceRegisterResponse>(
    withQuery('/api/finance/bulk-register', shareToGroupQuery(shareToGroup)),
    jsonBody('POST', data),
    token,
  )
}

export async function listFinanceCategories(
  type: FinanceCategoryType,
  token?: string,
): Promise<FinanceCategory[]> {
  return listItems<FinanceCategory>(withQuery('/api/finance/categories', { type }), token)
}

// shareToGroup:true면 그룹 소유로 생성한다 — 단 부모가 개인 소유면 서버가 400(개인 부모 아래
// 그룹 자식 = 고아 트리 방지). 호출부(CategoryFormDialog)가 부모 소유 형태로 토글을 게이팅한다.
export async function createFinanceCategory(
  data: FinanceCategoryRequest,
  { shareToGroup, token }: { shareToGroup?: boolean; token?: string } = {},
): Promise<FinanceCategory> {
  return fetchEither<FinanceCategory>(
    withQuery('/api/finance/categories', shareToGroupQuery(shareToGroup)),
    jsonBody('POST', data),
    token,
  )
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

// 개인 소유 카테고리를 소유자의 현재 그룹으로 공유 전환한다. 하위 카테고리도 함께 전환된다(kista-api cascade).
export async function shareFinanceCategory(id: string, token?: string): Promise<FinanceCategory> {
  return shareToggle<FinanceCategory>('/api/finance/categories', 'share', id, token)
}

// 그룹 공유 카테고리를 개인 소유로 되돌린다. 하위 카테고리도 함께 전환된다(kista-api cascade).
export async function unshareFinanceCategory(id: string, token?: string): Promise<FinanceCategory> {
  return shareToggle<FinanceCategory>('/api/finance/categories', 'unshare', id, token)
}

// 관리자 전용 시스템(공통) 카테고리 CRUD — groupId 없이 항상 system:true로 생성된다.
// /api/admin/** 는 app/api/admin/[[...path]]/route.ts가 그대로 프록시하며 kista-api가 서버에서 ADMIN role을 검증한다.
export async function listSystemFinanceCategories(type: FinanceCategoryType, token?: string): Promise<FinanceCategory[]> {
  return listItems<FinanceCategory>(withQuery('/api/admin/finance/categories', { type }), token)
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

export async function listFinanceAccounts(token?: string): Promise<FinanceAccount[]> {
  return listItems<FinanceAccount>('/api/finance/accounts', token)
}

export async function createFinanceAccount(
  data: FinanceAccountRequest,
  { shareToGroup, token }: { shareToGroup?: boolean; token?: string } = {},
): Promise<FinanceAccount> {
  return fetchEither<FinanceAccount>(
    withQuery('/api/finance/accounts', shareToGroupQuery(shareToGroup)),
    jsonBody('POST', data),
    token,
  )
}

export async function updateFinanceAccount(id: string, data: FinanceAccountRequest, token?: string): Promise<FinanceAccount> {
  return fetchEither<FinanceAccount>(`/api/finance/accounts/${encodeURIComponent(id)}`, jsonBody('PUT', data), token)
}

export async function deleteFinanceAccount(id: string, token?: string): Promise<void> {
  return fetchEither<void>(`/api/finance/accounts/${encodeURIComponent(id)}`, { method: 'DELETE' }, token)
}

// 개인 소유 계좌를 소유자의 현재 그룹으로 공유 전환한다(본인 소유·그룹 소속 상태에서만 성공).
export async function shareFinanceAccount(id: string, token?: string): Promise<FinanceAccount> {
  return shareToggle<FinanceAccount>('/api/finance/accounts', 'share', id, token)
}

// 그룹 공유 계좌를 개인 소유로 되돌린다(같은 그룹 멤버면 누구든 가능, 이미 개인 소유면 멱등).
export async function unshareFinanceAccount(id: string, token?: string): Promise<FinanceAccount> {
  return shareToggle<FinanceAccount>('/api/finance/accounts', 'unshare', id, token)
}

export async function listMonthlyClosings(token?: string): Promise<MonthlyClosing[]> {
  return listItems<MonthlyClosing>('/api/finance/monthly-closings', token)
}

export async function setMonthlyClosing(month: string, completed: boolean, token?: string): Promise<MonthlyClosing> {
  return fetchEither<MonthlyClosing>(
    `/api/finance/monthly-closings/${encodeURIComponent(month)}`,
    jsonBody('PATCH', { completed }),
    token,
  )
}

export async function listFinanceGroups(token?: string): Promise<FinanceGroup[]> {
  return listItems<FinanceGroup>('/api/finance/groups', token)
}

export async function listFinanceGroupMembers(groupId: string, token?: string): Promise<FinanceGroupMember[]> {
  return listItems<FinanceGroupMember>(`/api/finance/groups/${encodeURIComponent(groupId)}/members`, token)
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

interface TransactionListOptions {
  token?: string
  from?: string
  to?: string
  type?: FinanceCategoryType
  // 서버가 이 카테고리의 하위 트리까지 포함해 거른다.
  categoryId?: string
  memo?: string
  // `${key},${dir}` — key: transactionDate|category|memo|amount, dir: asc|desc. 커서는 같은 sort에서만 유효(다르면 400).
  sort?: string
  cursor?: string
  size?: number
}

export async function listFinanceTransactions({ token, ...params }: TransactionListOptions = {}): Promise<FinanceTransactionPage> {
  const page = await fetchEither<FinanceTransactionPage>(
    withQuery('/api/finance/transactions', params),
    { method: 'GET' },
    token,
  )
  return { ...page, items: page.items.map(withDefaultAmount) }
}

export async function createFinanceTransaction(
  data: FinanceTransactionRequest,
  { shareToGroup, token }: { shareToGroup?: boolean; token?: string } = {},
): Promise<FinanceTransaction> {
  const saved = await fetchEither<FinanceTransaction>(
    withQuery('/api/finance/transactions', shareToGroupQuery(shareToGroup)),
    jsonBody('POST', data),
    token,
  )
  return withDefaultAmount(saved)
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
  return withDefaultAmount(saved)
}

export async function deleteFinanceTransaction(id: string, token?: string): Promise<void> {
  return fetchEither<void>(`/api/finance/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' }, token)
}

// 개인 소유 거래내역을 소유자의 현재 그룹으로 공유 전환한다(본인 소유·그룹 소속 상태에서만 성공).
export async function shareFinanceTransaction(id: string, token?: string): Promise<FinanceTransaction> {
  return withDefaultAmount(await shareToggle<FinanceTransaction>('/api/finance/transactions', 'share', id, token))
}

// 그룹 공유 거래내역을 개인 소유로 되돌린다(같은 그룹 멤버면 누구든 가능, 이미 개인 소유면 멱등).
export async function unshareFinanceTransaction(id: string, token?: string): Promise<FinanceTransaction> {
  return withDefaultAmount(await shareToggle<FinanceTransaction>('/api/finance/transactions', 'unshare', id, token))
}

interface BudgetListOptions {
  token?: string
  categoryId?: string
  date?: string
}

export async function listFinanceBudgets({ token, categoryId, date }: BudgetListOptions = {}): Promise<FinanceBudget[]> {
  const list = await listItems<FinanceBudget>(withQuery('/api/finance/budgets', { categoryId, date }), token)
  return list.map(withDefaultAmount)
}

// shareToGroup:true면 그룹 소유로 생성 — 그룹 스코프에 기간이 겹치는 예산이 있으면 서버가 409
// (finance_budgets_no_overlap). 개인 스코프 겹침은 서버가 규칙대로 자동 트림/삭제한다.
export async function createFinanceBudget(
  data: FinanceBudgetRequest,
  { shareToGroup, token }: { shareToGroup?: boolean; token?: string } = {},
): Promise<FinanceBudget> {
  const saved = await fetchEither<FinanceBudget>(
    withQuery('/api/finance/budgets', shareToGroupQuery(shareToGroup)),
    jsonBody('POST', data),
    token,
  )
  return withDefaultAmount(saved)
}

export async function updateFinanceBudget(id: string, data: FinanceBudgetRequest, token?: string): Promise<FinanceBudget> {
  const saved = await fetchEither<FinanceBudget>(`/api/finance/budgets/${encodeURIComponent(id)}`, jsonBody('PUT', data), token)
  return withDefaultAmount(saved)
}

export async function deleteFinanceBudget(id: string, token?: string): Promise<void> {
  return fetchEither<void>(`/api/finance/budgets/${encodeURIComponent(id)}`, { method: 'DELETE' }, token)
}

// 개인 소유 예산을 소유자의 현재 그룹으로 공유 전환한다(본인 소유·그룹 소속 상태에서만 성공).
export async function shareFinanceBudget(id: string, token?: string): Promise<FinanceBudget> {
  return withDefaultAmount(await shareToggle<FinanceBudget>('/api/finance/budgets', 'share', id, token))
}

// 그룹 공유 예산을 개인 소유로 되돌린다(같은 그룹 멤버면 누구든 가능, 이미 개인 소유면 멱등).
export async function unshareFinanceBudget(id: string, token?: string): Promise<FinanceBudget> {
  return withDefaultAmount(await shareToggle<FinanceBudget>('/api/finance/budgets', 'unshare', id, token))
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

// ── 서버 집계(GET 전용). 기준일은 서버 Clock(KST)이라 today를 보내지 않는다. 기간 모드는 UI의 'monthly'|'yearly'를
// 서버 enum으로 바꿔 보낸다. range·months를 생략하면 서버가 전체 기간을 쓴다(UI의 'all').
const FLOW_MODE = { monthly: 'MONTHLY', yearly: 'YEARLY' } as const

function optionalNumber(value: number | undefined): string | undefined {
  return value === undefined ? undefined : String(value)
}

// month 생략 = 최근 기록 월(기록이 없으면 month·current가 null).
export async function getAssetSummary(month?: string, token?: string): Promise<AssetSummary> {
  return fetchEither<AssetSummary>(withQuery('/api/finance/asset-snapshots/summary', { month }), { method: 'GET' }, token)
}

export async function getAssetTrend({ months, endMonth }: { months?: number; endMonth?: string }, token?: string): Promise<AssetTrend> {
  return fetchEither<AssetTrend>(
    withQuery('/api/finance/asset-snapshots/trend', { months: optionalNumber(months), endMonth }),
    { method: 'GET' },
    token,
  )
}

export async function getAssetComposition(
  { basis, months, endMonth }: { basis: AssetCompositionBasis; months?: number; endMonth?: string },
  token?: string,
): Promise<AssetComposition> {
  return fetchEither<AssetComposition>(
    withQuery('/api/finance/asset-snapshots/composition', { basis, months: optionalNumber(months), endMonth }),
    { method: 'GET' },
    token,
  )
}

export async function getAssetCheck(month: string, token?: string): Promise<AssetCheck> {
  return fetchEither<AssetCheck>(withQuery('/api/finance/asset-snapshots/check', { month }), { method: 'GET' }, token)
}

interface FlowAggregateParams {
  type: FinanceCategoryType
  period: Period
}

function flowQuery({ type, period }: FlowAggregateParams) {
  return { type, mode: FLOW_MODE[period.mode], month: period.month }
}

export async function getFlowSummary(params: FlowAggregateParams, token?: string): Promise<FlowSummary> {
  return fetchEither<FlowSummary>(withQuery('/api/finance/transactions/summary', flowQuery(params)), { method: 'GET' }, token)
}

// range: 버킷 수(1~120). 생략하면 가장 오래된 거래부터 전체.
export async function getFlowTrend({ range, ...params }: FlowAggregateParams & { range?: number }, token?: string): Promise<FlowTrend> {
  return fetchEither<FlowTrend>(
    withQuery('/api/finance/transactions/trend', { ...flowQuery(params), range: optionalNumber(range) }),
    { method: 'GET' },
    token,
  )
}

export async function getBudgetProgress(params: FlowAggregateParams, token?: string): Promise<BudgetProgress> {
  return fetchEither<BudgetProgress>(withQuery('/api/finance/transactions/budget-progress', flowQuery(params)), { method: 'GET' }, token)
}

type PreviewNode = components['schemas']['Node']

// 서버 nullable 필드를 undefined로 정규화한다 — 등록 요청(BulkFinanceRegisterRequest)에 null이 실리지 않게.
function toGroupNode(node: PreviewNode): CategoryGroupNode {
  return {
    id: node.id,
    name: node.name,
    sortOrder: node.sortOrder,
    items: node.items.map((item) => ({
      id: item.id,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      categoryPath: item.categoryPath,
      memo: item.memo ?? undefined,
      amount: item.amount,
      assetClass: (item.assetClass ?? undefined) as AssetClass | undefined,
      market: (item.market ?? undefined) as Market | undefined,
      strategy: item.strategy ?? undefined,
      accountId: item.accountId ?? undefined,
      accountName: item.accountName ?? undefined,
      accountInstitution: item.accountInstitution ?? undefined,
      accountOwner: item.accountOwner ?? undefined,
    })),
    children: node.children.map(toGroupNode),
  }
}

// 소스월의 자산·수입·소비·저축 기록을 카테고리 계층 그룹 트리로 받는다(정렬은 서버 — 자산군·시장은 enum 선언 순서).
export async function getBulkRegisterPreview(sourceMonth: string, token?: string): Promise<BulkRegisterPreview> {
  const preview = await fetchEither<components['schemas']['BulkRegisterPreviewResponse']>(
    withQuery('/api/finance/bulk-register/preview', { sourceMonth }),
    { method: 'GET' },
    token,
  )
  return {
    asset: preview.asset.map(toGroupNode),
    income: preview.income.map(toGroupNode),
    expense: preview.expense.map(toGroupNode),
    saving: preview.saving.map(toGroupNode),
  }
}
