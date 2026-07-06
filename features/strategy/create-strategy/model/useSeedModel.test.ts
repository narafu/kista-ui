import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useSeedModel } from './useSeedModel'

describe('useSeedModel', () => {
  it('treats missing USD deposit as an invalid seed when balance check is enabled', () => {
    const { result } = renderHook(() =>
      useSeedModel({
        balanceCheckEnabled: true,
        usdDeposit: null,
        minSeed: null,
      }),
    )

    expect(result.current.seedUsd).toBeNull()
    expect(result.current.isInvalidSeed).toBe(true)
  })
})
