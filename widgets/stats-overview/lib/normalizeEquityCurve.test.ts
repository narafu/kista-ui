import { describe, it, expect } from 'vitest'
import { normalizeEquityCurve, excessReturnPp } from './normalizeEquityCurve'

const points = [
  { date: '2026-06-01', totalAsset: 1000, principal: 1000 },
  { date: '2026-06-02', totalAsset: 1100, principal: 1000 },
]

describe('normalizeEquityCurve', () => {
  it('자산 첫 값을 100으로 정규화하고 원금도 같은 분모를 쓴다', () => {
    const rows = normalizeEquityCurve(points, [])
    expect(rows[0]).toEqual({ date: '2026-06-01', asset: 100, principal: 100, benchmark: null })
    expect(rows[1].asset).toBeCloseTo(110)
    expect(rows[1].principal).toBeCloseTo(100)
  })

  it('벤치마크는 지수 첫 값 기준 100으로 정규화하고 결손일은 직전 값을 쓴다', () => {
    const rows = normalizeEquityCurve(points, [{ date: '2026-06-01', close: 500 }])
    expect(rows[0].benchmark).toBeCloseTo(100)
    expect(rows[1].benchmark).toBeCloseTo(100) // 06-02 결손 → carry-forward
  })

  it('빈 입력이면 빈 배열', () => {
    expect(normalizeEquityCurve([], [])).toEqual([])
  })

  it('초과수익은 마지막 행의 자산-벤치마크 차이', () => {
    const rows = normalizeEquityCurve(points, [
      { date: '2026-06-01', close: 500 },
      { date: '2026-06-02', close: 525 },
    ])
    expect(excessReturnPp(rows)).toBeCloseTo(110 - 105)
  })

  it('벤치마크가 없으면 초과수익은 null', () => {
    expect(excessReturnPp(normalizeEquityCurve(points, []))).toBeNull()
  })
})
