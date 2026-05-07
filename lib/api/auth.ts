import { apiFetch } from './client'
import type { User } from '@/types/user'

export async function getMe(token: string): Promise<User> {
  return apiFetch<User>('/api/auth/me', { method: 'GET' }, token)
}

export async function reapply(token: string): Promise<void> {
  return apiFetch<void>('/api/auth/reapply', { method: 'POST' }, token)
}
