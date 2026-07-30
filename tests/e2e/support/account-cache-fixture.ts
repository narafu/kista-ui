export const ACCOUNT_CACHE_USER_ID = '00000000-0000-0000-0000-000000000001'
export const ACCOUNT_CACHE_PREFIX = 'e2e-account-cache-'

export type AccountOwnershipRecord = {
  id: string
  nickname: string
}

export function normalizeAccountCacheApiBase(apiBase: string) {
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

  const labels = unrecordedAccounts.map((account) => `${account.nickname} (${account.id})`).join(', ')
  throw new Error(
    `Account-cache E2E requires an empty test user but found unrecorded accounts: ${labels}. `
      + 'Remove every account manually through the local UI or API, then rerun the suite; no accounts were deleted.',
  )
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
