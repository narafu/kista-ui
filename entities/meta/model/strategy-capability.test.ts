import { describe, it, expect } from 'vitest'
import { deriveSeedSource } from './strategy-capability'
import type { StrategyTypeMeta } from './types'

const makeTypeMeta = (overrides: Partial<StrategyTypeMeta>): StrategyTypeMeta => ({
  code: 'INFINITE',
  availableTickers: [],
  requiresPrivacyBase: false,
  tickerFixed: false,
  supportsReverseMode: false,
  divisionCounts: [],
  ...overrides,
})

describe('deriveSeedSource', () => {
  it('requiresPrivacyBase=true면 PRIVACY_BASE', () => {
    expect(deriveSeedSource(makeTypeMeta({ requiresPrivacyBase: true }))).toBe('PRIVACY_BASE')
  })
  it('requiresPrivacyBase=false면 CURRENT_PRICE', () => {
    expect(deriveSeedSource(makeTypeMeta({ requiresPrivacyBase: false }))).toBe('CURRENT_PRICE')
  })
})
