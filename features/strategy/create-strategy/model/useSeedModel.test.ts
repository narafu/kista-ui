import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Strategy } from '@entities/strategy'
import { isBelowMinSeed, useSeedModel } from './useSeedModel'

describe('isBelowMinSeed', () => {
  it('is not below min seed when existing holdings value plus deposit covers the minimum', () => {
    expect(isBelowMinSeed({ seedUsd: 2300.6, minSeed: 3429.6, avgPrice: 87, quantity: 13 })).toBe(false)
  })

  it('is still below min seed when existing holdings value plus deposit falls short', () => {
    expect(isBelowMinSeed({ seedUsd: 2000, minSeed: 3429.6, avgPrice: 87, quantity: 13 })).toBe(true)
  })

  it('allows zero deposit when existing holdings value alone meets the minimum seed', () => {
    expect(isBelowMinSeed({ seedUsd: 0, minSeed: 3000, avgPrice: 100, quantity: 31 })).toBe(false)
  })

  it('cannot judge without a min seed or a seed', () => {
    expect(isBelowMinSeed({ seedUsd: 0, minSeed: null, avgPrice: null, quantity: null })).toBe(false)
    expect(isBelowMinSeed({ seedUsd: null, minSeed: 3000, avgPrice: null, quantity: null })).toBe(false)
  })
})

describe('useSeedModel', () => {
  it('등록은 0에서 시작하고 수정은 저장값을 유지한다', () => {
    expect(renderHook(() => useSeedModel({})).result.current.seedUsdInput).toBe(0)
    const initial = { initialDeposit: 1200 } as Strategy
    expect(renderHook(() => useSeedModel({ initial })).result.current.seedUsdInput).toBe(1200)
    expect(renderHook(() => useSeedModel({ initial: {} as Strategy })).result.current.seedUsdInput).toBeNull()
  })

  it('allows zero deposit when there are existing holdings', () => {
    const { result } = renderHook(() => useSeedModel({ avgPrice: 100, quantity: 31 }))

    act(() => result.current.setSeedUsdInput(0))

    expect(result.current.isInvalidSeed).toBe(false)
  })

  it('still rejects zero deposit when there are no existing holdings', () => {
    const { result } = renderHook(() => useSeedModel({ avgPrice: null, quantity: null }))

    act(() => result.current.setSeedUsdInput(0))

    expect(result.current.isInvalidSeed).toBe(true)
  })

  it('seedUsd는 직접 입력값을 그대로 쓴다', () => {
    const { result } = renderHook(() => useSeedModel({}))

    act(() => result.current.setSeedUsdInput(777.5))

    expect(result.current.seedUsd).toBe(777.5)
  })
})
