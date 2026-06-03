import { unstable_cache } from 'next/cache'
import { listAccounts } from '@/lib/api/accounts'
import { listStrategies } from '@/lib/api/strategies'
import { getMe } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'
import { cacheTags } from './tags'
import type { Account } from '@/types/account'
import type { Strategy } from '@/types/strategy'
import type { User } from '@/types/user'

const REVALIDATE = 300 // 5분 — 태그 무효화로 즉시 갱신 가능

export function getCachedAccounts(token: string): Promise<Account[]> {
  const tag = cacheTags.accounts(token)
  return unstable_cache(
    async () => listAccounts(token),
    [tag],
    { tags: [tag], revalidate: REVALIDATE }
  )()
}

export function getCachedStrategies(accountId: string, token: string): Promise<Strategy[]> {
  const tag = cacheTags.strategies(token)
  return unstable_cache(
    async () => {
      try {
        return await listStrategies(accountId, token)
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return []
        throw e
      }
    },
    [tag, accountId],
    { tags: [tag], revalidate: REVALIDATE }
  )()
}

export function getCachedUser(token: string): Promise<User> {
  const tag = cacheTags.user(token)
  return unstable_cache(
    async () => getMe(token),
    [tag],
    { tags: [tag], revalidate: REVALIDATE }
  )()
}
