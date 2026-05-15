import { ApiError } from './client'

export async function updateTelegram(data: { botToken: string; chatId: string }): Promise<void> {
  const res = await fetch('/api/settings/telegram', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new ApiError(res.status, null)
}

export async function deleteTelegram(): Promise<void> {
  const res = await fetch('/api/settings/telegram', { method: 'DELETE' })
  if (!res.ok) throw new ApiError(res.status, null)
}
