export const ACCOUNT_CACHE_USER_ID = '00000000-0000-0000-0000-000000000001'
export const ACCOUNT_CACHE_PREFIX = 'e2e-account-cache-'

export type AccountOwnershipRecord = {
  id: string
  nickname: string
}

export function assertAccountCacheOwnership(apiBase: string, userId: string) {
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

  if (userId !== ACCOUNT_CACHE_USER_ID) {
    throw new Error(`Unexpected E2E user identity ${userId}; refusing account cleanup`)
  }
}

export function accountCleanupCandidates(
  accounts: AccountOwnershipRecord[],
  createdAccountIds: ReadonlySet<string>,
) {
  return accounts.filter((account) =>
    createdAccountIds.has(account.id) || account.nickname.startsWith(ACCOUNT_CACHE_PREFIX),
  )
}

export function assertNoForeignAccounts(accounts: AccountOwnershipRecord[]) {
  const foreignAccounts = accounts.filter((account) => !account.nickname.startsWith(ACCOUNT_CACHE_PREFIX))
  if (foreignAccounts.length === 0) return

  const labels = foreignAccounts.map((account) => `${account.nickname} (${account.id})`).join(', ')
  throw new Error(`Account-cache E2E shared dev identity contains non-owned accounts: ${labels}`)
}
