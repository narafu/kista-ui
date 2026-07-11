import { unstable_cache } from 'next/cache'
import { getMe } from './index'
import { cacheTags } from '@shared/lib/cache/tags'
import type { User } from '../model/types'

const REVALIDATE = 300 // 5분 — 태그 무효화로 즉시 갱신 가능

export function getCachedUser(token: string): Promise<User> {
  const tag = cacheTags.user(token)
  return unstable_cache(
    async () => getMe(token),
    [tag],
    { tags: [tag], revalidate: REVALIDATE }
  )()
}
