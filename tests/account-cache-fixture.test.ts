import { describe, expect, it } from 'vitest'

import {
  ACCOUNT_CACHE_USER_ID,
  accountCleanupCandidates,
  assertAccountCacheOwnership,
  assertNoForeignAccounts,
} from './e2e/support/account-cache-fixture'

const reserved = { id: 'reserved-1', nickname: 'e2e-account-cache-leftover' }
const created = { id: 'created-1', nickname: 'created-by-this-spec-id' }
const foreign = { id: 'foreign-1', nickname: 'manual-local-account' }

describe('account cache E2E ownership', () => {
  it.each([
    'https://example.com',
    'http://kista-api.internal:8080',
    'https://localhost:8080',
    'http://localhost:8080/api',
  ])('rejects a non-local or path-scoped API base: %s', (apiBase) => {
    expect(() => assertAccountCacheOwnership(apiBase, ACCOUNT_CACHE_USER_ID)).toThrow(/refusing account cleanup/i)
  })

  it('rejects any identity except the fixed local dev user', () => {
    expect(() => assertAccountCacheOwnership('http://localhost:8080', 'production-user')).toThrow(
      /unexpected E2E user identity/i,
    )
  })

  it('allows only loopback HTTP with the fixed local dev identity', () => {
    expect(() => assertAccountCacheOwnership('http://127.0.0.1:8080', ACCOUNT_CACHE_USER_ID)).not.toThrow()
  })

  it('selects only reserved-prefix leftovers and IDs created by the spec for cleanup', () => {
    expect(accountCleanupCandidates([reserved, created, foreign], new Set([created.id]))).toEqual([reserved, created])
  })

  it('refuses first-account setup when the shared dev identity owns a foreign account', () => {
    expect(() => assertNoForeignAccounts([reserved, foreign])).toThrow(/manual-local-account/)
  })
})
