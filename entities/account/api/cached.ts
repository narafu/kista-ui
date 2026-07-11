import { unstable_cache } from 'next/cache'
import { listAccounts } from './index'
import { cacheTags } from '@shared/lib/cache/tags'
import type { Account } from '../model/types'

const REVALIDATE = 300 // 5분 — 태그 무효화로 즉시 갱신 가능

export function getCachedAccounts(token: string): Promise<Account[]> {
  const tag = cacheTags.accounts(token)
  return unstable_cache(
    async () => listAccounts(token),
    [tag],
    { tags: [tag], revalidate: REVALIDATE }
  )()
}
