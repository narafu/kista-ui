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

  it('첫 자산이 0이면 첫 양수 자산을 기준으로 정규화한다', () => {
    const rows = normalizeEquityCurve([
      { date: '2026-06-01', totalAsset: 0, principal: 0 },
      { date: '2026-06-02', totalAsset: 200, principal: 200 },
      { date: '2026-06-03', totalAsset: 300, principal: 200 },
    ])
    expect(rows.map((r) => r.asset)).toEqual([0, 100, 150])
    expect(rows.map((r) => r.principal)).toEqual([0, 100, 100])
  })

  it('빈 입력이면 빈 배열', () => {
    expect(normalizeEquityCurve([])).toEqual([])
  })
})
