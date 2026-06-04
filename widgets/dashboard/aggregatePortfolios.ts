import { toNum } from '@shared/lib/utils'
import type { PortfolioSnapshot } from '@entities/trade'

interface PortfolioSummaryRaw {
  positions?: Array<{ evalAmountUsd?: number | string | null }>
  summary?: {
    totalAssetUsd?: number | string | null
    totalEvalProfit?: number | string | null
    totalReturnRate?: number | string | null
  }
}

export interface AggregatedPortfolio {
  totalAssetUsd: number
  marketValueUsd: number
  usdDeposit: number
  totalEvalProfit: number
  weightedReturnRate: number
}

export function aggregatePortfolios(raws: (PortfolioSnapshot | null)[]): AggregatedPortfolio {
  let totalAssetUsd = 0
  let marketValueUsd = 0
  let totalEvalProfit = 0
  let weightedSum = 0

  for (const raw of raws) {
    if (!raw) continue
    const r = raw as unknown as PortfolioSummaryRaw
    const assetUsd = toNum(r.summary?.totalAssetUsd)
    const evalProfit = toNum(r.summary?.totalEvalProfit)
    const returnRate = toNum(r.summary?.totalReturnRate)
    const posEval = (r.positions ?? []).reduce((s, p) => s + toNum(p.evalAmountUsd), 0)

    totalAssetUsd += assetUsd
    totalEvalProfit += evalProfit
    marketValueUsd += posEval
    weightedSum += posEval * returnRate
  }

  return {
    totalAssetUsd,
    marketValueUsd,
    usdDeposit: totalAssetUsd - marketValueUsd,
    totalEvalProfit,
    weightedReturnRate: marketValueUsd > 0 ? weightedSum / marketValueUsd : 0,
  }
}
