import type { EquityPoint } from '@entities/stats'

export interface NormalizedRow {
  date: string
  asset: number
  principal: number
}

// 자산·원금은 자산 첫 값=100으로 정규화.
export function normalizeEquityCurve(points: EquityPoint[]): NormalizedRow[] {
  if (points.length === 0) return []
  const assetBase = points[0].totalAsset

  return points.map((p) => {
    return {
      date: p.date,
      asset: assetBase > 0 ? (p.totalAsset / assetBase) * 100 : 0,
      principal: assetBase > 0 ? (p.principal / assetBase) * 100 : 0,
    }
  })
}
