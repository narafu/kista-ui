import { unstable_cache } from 'next/cache'
import { listStrategies } from './index'
import { ApiError } from '@shared/lib/api-client'
import { cacheTags } from '@shared/lib/cache/tags'
import type { Strategy } from '../model/types'

const REVALIDATE = 300 // 5분 — 태그 무효화로 즉시 갱신 가능

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
