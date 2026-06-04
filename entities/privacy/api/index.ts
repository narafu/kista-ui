import { clientFetch } from '@shared/lib/api-client'
import type { PrivacyCurrentBase } from '../model/types'

export async function getPrivacyCurrentBase(): Promise<PrivacyCurrentBase> {
  return clientFetch<PrivacyCurrentBase>('/api/privacy-trades/base/latest')
}
