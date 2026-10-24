import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useSeedModel } from './useSeedModel'

describe('useSeedModel', () => {
  it('is not below min seed when existing holdings value plus deposit covers the minimum', () => {
    const { result } = renderHook(() =>
      useSeedModel({
        minSeed: 3429.6,
        avgPrice: 87,
        quantity: 13,
      }),
    )

    act(() => result.current.setSeedUsdInput(2300.6))

    expect(result.current.isBelowMinSeed).toBe(false)
  })

  it('is still below min seed when existing holdings value plus deposit falls short', () => {
    const { result } = renderHook(() =>
      useSeedModel({
        minSeed: 3429.6,
        avgPrice: 87,
        quantity: 13,
      }),
    )

    act(() => result.current.setSeedUsdInput(2000))

    expect(result.current.isBelowMinSeed).toBe(true)
  })

  it('allows zero deposit when existing holdings value alone meets the minimum seed', () => {
    const { result } = renderHook(() =>
      useSeedModel({
        minSeed: 3000,
        avgPrice: 100,
        quantity: 31,
      }),
    )

    act(() => result.current.setSeedUsdInput(0))

    expect(result.current.isBelowMinSeed).toBe(false)
    expect(result.current.isInvalidSeed).toBe(false)
  })

  it('still rejects zero deposit when there are no existing holdings', () => {
    const { result } = renderHook(() =>
      useSeedModel({
        minSeed: 3000,
        avgPrice: null,
        quantity: null,
      }),
    )

    act(() => result.current.setSeedUsdInput(0))

    expect(result.current.isInvalidSeed).toBe(true)
  })

  it('seedUsd는 직접 입력값을 그대로 쓴다', () => {
    const { result } = renderHook(() => useSeedModel({ minSeed: null }))

    act(() => result.current.setSeedUsdInput(777.5))

    expect(result.current.seedUsd).toBe(777.5)
  })
})
