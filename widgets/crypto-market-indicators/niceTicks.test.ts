import { describe, expect, it } from 'vitest'
import { fmtCompactUsdTick, niceTicks, stepDecimals } from './niceTicks'

describe('niceTicks', () => {
  it('picks 1·2·2.5·5 steps that cover the values', () => {
    expect(niceTicks([-0.0032, 0.01])).toEqual([-0.005, 0, 0.005, 0.01])
    expect(niceTicks([0, 0.01])).toEqual([0, 0.0025, 0.005, 0.0075, 0.01])
    expect(niceTicks([-0.5, 3.1])).toEqual([-1, 0, 1, 2, 3, 4])
    expect(niceTicks([0.3, 0.7])).toEqual([0.3, 0.4, 0.5, 0.6, 0.7]) // 0.3 / 0.1 = 2.9999… 로 한 칸 더 붙지 않는다
    expect(niceTicks([7.6e9, 9.5e9])).toEqual([7.5e9, 8e9, 8.5e9, 9e9, 9.5e9])
  })

  it('pads a flat series and returns nothing without values', () => {
    expect(niceTicks([0.01])).toEqual([0.009, 0.0095, 0.01, 0.0105, 0.011])
    expect(niceTicks([])).toBeUndefined()
  })

  it('formats every tick distinctly at the precision its step needs', () => {
    expect([0.05, 2.5, 50, 0.0025, 1, 1e-7, 0.0025000000000000005].map(stepDecimals)).toEqual([2, 1, 0, 4, 0, 7, 4])
    const usd = (ticks: number[]) => ticks.map((t) => fmtCompactUsdTick(t, ticks[1] - ticks[0]))
    expect(usd(niceTicks([7.6e9, 7.75e9])!)).toEqual(['$7.60B', '$7.65B', '$7.70B', '$7.75B'])
    expect(usd([1e9, 1.25e9, 1.5e9])).toEqual(['$1.00B', '$1.25B', '$1.50B'])
    expect(usd([7.5e9, 8e9, 8.5e9])).toEqual(['$7.5B', '$8.0B', '$8.5B'])
  })
})
