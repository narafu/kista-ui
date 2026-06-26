import type { StrategyTypeMeta } from './types'

export type SeedSource = 'PRIVACY_BASE' | 'CURRENT_PRICE'

export function deriveSeedSource(meta: StrategyTypeMeta): SeedSource {
  return meta.requiresPrivacyBase ? 'PRIVACY_BASE' : 'CURRENT_PRICE'
}
