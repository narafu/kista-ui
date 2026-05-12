import { apiFetch, ApiError } from './client'
import type { User } from '@/types/user'

export async function getMe(token: string): Promise<User> {
  return apiFetch<User>('/api/auth/me', { method: 'GET' }, token)
}

export async function reapply(): Promise<void> {
  const res = await fetch('/api/auth/reapply-done', { method: 'POST' })
  if (!res.ok) {
    let body: unknown
    try { body = await res.json() } catch { body = null }
    throw new ApiError(res.status, body)
  }
}
