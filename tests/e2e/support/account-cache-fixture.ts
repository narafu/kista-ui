export const ACCOUNT_CACHE_USER_ID = '00000000-0000-0000-0000-000000000003'
export const ACCOUNT_CACHE_PREFIX = 'e2e-account-cache-'

type AccountOwnershipRecord = {
  id: string
  nickname: string
}

function normalizeAccountCacheApiBase(apiBase: string) {
  let url: URL
  try {
    url = new URL(apiBase)
  } catch {
    throw new Error(`Refusing account cleanup: invalid E2E_API_BASE ${apiBase}`)
  }

  const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]'])
  const hasOriginOnly = url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password
  if (url.protocol !== 'http:' || !loopbackHosts.has(url.hostname) || !hasOriginOnly) {
    throw new Error(`Refusing account cleanup outside a loopback HTTP API origin: ${apiBase}`)
  }

  return `http://localhost${url.port ? `:${url.port}` : ''}`
}

export function assertAccountCacheOwnership(apiBase: string, userId: string) {
  const normalizedApiBase = normalizeAccountCacheApiBase(apiBase)

  if (userId !== ACCOUNT_CACHE_USER_ID) {
    throw new Error(`Unexpected E2E user identity ${userId}; refusing account cleanup`)
  }

  return normalizedApiBase
}

export function accountCleanupCandidates(
  accounts: AccountOwnershipRecord[],
  createdAccountIds: ReadonlySet<string>,
) {
  return accounts.filter((account) => createdAccountIds.has(account.id))
}

export function assertOnlyRecordedAccounts(
  accounts: AccountOwnershipRecord[],
  createdAccountIds: ReadonlySet<string>,
) {
  const unrecordedAccounts = accounts.filter((account) => !createdAccountIds.has(account.id))
  if (unrecordedAccounts.length === 0) return

  throw new Error(
    `Account-cache E2E found accounts this run did not record: ${accountLabels(unrecordedAccounts)}. `
      + `Rerun the suite (MOCK leftovers named ${ACCOUNT_CACHE_PREFIX}* are cleared at start); `
      + 'remove any other account manually. No accounts were deleted.',
  )
}

function accountLabels(accounts: AccountOwnershipRecord[]) {
  return accounts.map((account) => `${account.nickname} (${account.id})`).join(', ')
}

// 시작 시 자동 정리 대상은 이 스펙이 만드는 계좌(MOCK + 접두사)뿐이다 — 전용 E2E 사용자라도
// 수동으로 붙인 계좌(실증권사 키 포함 가능)는 지우지 않고 멈춘다
export function selectLeftoverAccounts<T extends AccountOwnershipRecord & { broker: string }>(accounts: T[]) {
  const foreign = accounts.filter((account) =>
    account.broker !== 'MOCK' || !account.nickname.startsWith(ACCOUNT_CACHE_PREFIX),
  )
  if (foreign.length > 0) {
    throw new Error(
      `Account-cache E2E user has accounts this suite did not create: ${accountLabels(foreign)}. `
        + 'Remove them manually through the local UI or API, then rerun the suite; no accounts were deleted.',
    )
  }
  return accounts
}

export async function cleanupRecordedAccounts(
  accounts: AccountOwnershipRecord[],
  createdAccountIds: ReadonlySet<string>,
  deleteAccount: (account: AccountOwnershipRecord) => Promise<void>,
) {
  assertOnlyRecordedAccounts(accounts, createdAccountIds)

  for (const account of accountCleanupCandidates(accounts, createdAccountIds)) {
    await deleteAccount(account)
  }
}
