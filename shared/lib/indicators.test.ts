import { describe, expect, it } from 'vitest'
import { rsi, sma } from './indicators'

describe('sma', () => {
  it('선행 구간은 null, 이후는 직전 period개 평균', () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4])
  })

  it('데이터가 period보다 짧으면 전부 null', () => {
    expect(sma([1, 2], 3)).toEqual([null, null])
  })
})

describe('rsi', () => {
  it('계속 오르면 100, 계속 내리면 0', () => {
    expect(rsi([1, 2, 3, 4], 2).slice(2)).toEqual([100, 100])
    expect(rsi([4, 3, 2, 1], 2).slice(2)).toEqual([0, 0])
  })

  it('Wilder 평활로 계산한다', () => {
    // 변화량 +1, -1 → 첫 평균 0.5/0.5 = 50, 다음 +2 → gain (0.5+2)/2=1.25, loss 0.5/2=0.25 → 100-100/6
    const result = rsi([10, 11, 10, 12], 2)
    expect(result.slice(0, 2)).toEqual([null, null])
    expect(result[2]).toBe(50)
    expect(result[3]).toBeCloseTo(100 - 100 / 6)
  })

  it('데이터가 period 이하면 전부 null', () => {
    expect(rsi([1, 2, 3], 3)).toEqual([null, null, null])
  })
})
