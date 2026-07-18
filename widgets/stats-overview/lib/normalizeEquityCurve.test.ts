import { describe, it, expect } from 'vitest'
import { normalizeEquityCurve } from './normalizeEquityCurve'

const points = [
  { date: '2026-06-01', totalAsset: 1000, principal: 1000 },
  { date: '2026-06-02', totalAsset: 1100, principal: 1000 },
]

describe('normalizeEquityCurve', () => {
  it('자산 첫 값을 100으로 정규화하고 원금도 같은 분모를 쓴다', () => {
    const rows = normalizeEquityCurve(points)
    expect(rows[0]).toEqual({ date: '2026-06-01', asset: 100, principal: 100 })
    expect(rows[1].asset).toBeCloseTo(110)
    expect(rows[1].principal).toBeCloseTo(100)
  })

  it('빈 입력이면 빈 배열', () => {
    expect(normalizeEquityCurve([])).toEqual([])
  })
})
