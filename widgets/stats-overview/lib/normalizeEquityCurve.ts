import type { BenchmarkPoint, EquityPoint } from '@entities/stats'

export interface NormalizedRow {
  date: string
  asset: number
  principal: number
  benchmark: number | null
}

// 자산·원금은 자산 첫 값=100, 벤치마크는 지수 첫 값=100으로 정규화.
// 벤치마크 결손일(지수 휴장 등)은 직전 값 carry-forward.
export function normalizeEquityCurve(
  points: EquityPoint[],
  benchmark: BenchmarkPoint[]
): NormalizedRow[] {
  if (points.length === 0) return []
  const assetBase = points[0].totalAsset
  const benchBase = benchmark[0]?.close

  const benchByDate = new Map(benchmark.map((b) => [b.date, b.close]))
  let lastBench: number | null = null

  return points.map((p) => {
    const close = benchByDate.get(p.date)
    if (close != null) lastBench = close
    return {
      date: p.date,
      asset: assetBase > 0 ? (p.totalAsset / assetBase) * 100 : 0,
      principal: assetBase > 0 ? (p.principal / assetBase) * 100 : 0,
      benchmark: benchBase != null && lastBench != null ? (lastBench / benchBase) * 100 : null,
    }
  })
}

export function excessReturnPp(rows: NormalizedRow[]): number | null {
  const last = rows[rows.length - 1]
  if (!last || last.benchmark == null) return null
  return last.asset - last.benchmark
}
