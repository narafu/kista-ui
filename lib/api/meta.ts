import { apiFetch, ApiError } from './client'
import type { MetaBundle } from '@/types/meta'

export async function getMetaBundle(token?: string): Promise<MetaBundle> {
  if (token) return apiFetch<MetaBundle>('/api/meta', {}, token)
  const res = await fetch('/api/meta')
  if (!res.ok) throw new ApiError(res.status, null)
  return res.json()
}
