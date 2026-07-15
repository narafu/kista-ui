import { clientFetch, fetchEither, jsonBody } from '@shared/lib/api-client'
import type { AdminSettings } from '../model/types'

export function getAdminSettings(token?: string): Promise<AdminSettings> {
  return fetchEither<AdminSettings>('/api/admin/settings', { cache: 'no-store' }, token)
}

export function updateAdminSettings(settings: AdminSettings): Promise<AdminSettings> {
  return clientFetch<AdminSettings>('/api/admin/settings', jsonBody('PUT', settings))
}
