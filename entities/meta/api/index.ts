import { ApiError } from '@shared/lib/api-client'
import type { MetaBundle } from '../model/types'

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL

// /api/meta는 permitAll + 사용자 무관 정적 메타 — 인증 여부와 관계없이 1시간 Data Cache 공유
export async function getMetaBundle(): Promise<MetaBundle> {
  const res = await fetch(`${API_BASE_URL}/api/meta`, { next: { revalidate: 3600 } })
  if (!res.ok) throw new ApiError(res.status, null)
  return res.json() as Promise<MetaBundle>
}
