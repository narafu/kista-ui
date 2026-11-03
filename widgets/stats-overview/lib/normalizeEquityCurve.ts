import type { EquityPoint } from '@entities/stats'

export interface NormalizedRow {
  date: string
  asset: number
  principal: number
}

// 자산·원금은 첫 양수 자산=100으로 정규화.
export function normalizeEquityCurve(points: EquityPoint[]): NormalizedRow[] {
  if (points.length === 0) return []
  // 첫 자산이 0인 곡선(초기 보유 없는 DCA 등)도 그리도록 첫 양수 자산을 기준으로 삼는다
  const assetBase = points.find((p) => p.totalAsset > 0)?.totalAsset ?? 0

  return points.map((p) => {
    return {
      date: p.date,
      asset: assetBase > 0 ? (p.totalAsset / assetBase) * 100 : 0,
      principal: assetBase > 0 ? (p.principal / assetBase) * 100 : 0,
    }
  })
}
