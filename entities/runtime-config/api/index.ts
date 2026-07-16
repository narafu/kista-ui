import { clientFetch } from '@shared/lib/api-client'
import type { RuntimeConfig } from '../model/types'

export function getRuntimeConfig(): Promise<RuntimeConfig> {
  return clientFetch<RuntimeConfig>('/api/runtime-config', { cache: 'no-store' })
}
