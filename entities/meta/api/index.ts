import { apiFetch, ApiError } from '@shared/lib/api-client'
import type { MetaBundle } from '../model/types'

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL

export async function getMetaBundle(token?: string): Promise<MetaBundle> {
  if (token) {
    try {
      return await apiFetch<MetaBundle>('/api/meta', {}, token)
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) throw e
    }
  }

  // 비인증 상태: Route Handler를 거치지 않고 kista-api 직접 호출 (1시간 캐시)
  const res = await fetch(`${API_BASE_URL}/api/meta`, { next: { revalidate: 3600 } })
  if (!res.ok) throw new ApiError(res.status, null)
  return res.json() as Promise<MetaBundle>
}
