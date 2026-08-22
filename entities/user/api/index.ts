import { apiFetch, clientFetch, jsonBody } from '@shared/lib/api-client'
import type { User } from '../model/types'

export async function getMe(token: string): Promise<User> {
  return apiFetch<User>('/api/auth/me', { method: 'GET' }, token)
}

export async function getMeClient(): Promise<User> {
  return clientFetch<User>('/api/auth/me', { method: 'GET' })
}

export async function updateNotificationPref(type: string, enabled: boolean): Promise<void> {
  await clientFetch<void>(`/api/settings/notifications/${type}`, jsonBody('PATCH', { enabled }))
}

export async function updateBalanceCheckEnabled(enabled: boolean): Promise<void> {
  await clientFetch<void>('/api/settings/balance-check', jsonBody('PATCH', { enabled }))
}

export async function updateStrategySuggestions(suggestions: string[]): Promise<void> {
  await clientFetch<void>('/api/settings/strategy-suggestions', jsonBody('PUT', { suggestions }))
}

export async function updateNickname(nickname: string): Promise<void> {
  await clientFetch<void>('/api/settings/nickname', jsonBody('PATCH', { nickname }))
}

export async function reapply(): Promise<void> {
  await clientFetch<void>('/api/auth/reapply-done', { method: 'POST' })
}

export async function deleteMe(): Promise<void> {
  await clientFetch<void>('/api/auth/me', { method: 'DELETE' })
}

export async function updateNotificationChannel(channel: string): Promise<void> {
  await clientFetch<void>('/api/settings/notification-channel', jsonBody('PATCH', { channel }))
}

export async function updateTelegram(data: { botToken: string; chatId: string }): Promise<void> {
  await clientFetch<void>('/api/settings/telegram', jsonBody('PUT', data))
}

export async function deleteTelegram(): Promise<void> {
  await clientFetch<void>('/api/settings/telegram', { method: 'DELETE' })
}
