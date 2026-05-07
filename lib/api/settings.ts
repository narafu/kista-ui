import { apiFetch } from './client'
import type { User } from '@/types/user'

export async function updateTelegram(
  data: { botToken: string; chatId: string },
  token: string
): Promise<User> {
  return apiFetch<User>('/api/settings/telegram', {
    method: 'PUT',
    body: JSON.stringify(data),
  }, token)
}

export async function deleteTelegram(token: string): Promise<void> {
  return apiFetch<void>('/api/settings/telegram', { method: 'DELETE' }, token)
}
