import { describe, expect, it } from 'vitest'
import { assetKeys } from './queryKeys'

describe('assetKeys', () => {
  it('keeps list and monthly-checks keys under the asset root', () => {
    expect(assetKeys.all).toEqual(['assets'])
    expect(assetKeys.list()).toEqual(['assets', 'list'])
    expect(assetKeys.monthlyChecksRoot()).toEqual(['assets', 'monthly-checks'])
    expect(assetKeys.monthlyChecks()).toEqual(['assets', 'monthly-checks', 'list'])
  })
})
