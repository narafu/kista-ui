import { toNum } from '@shared/lib/utils'
import type { PortfolioSnapshot } from '@entities/trade'

interface PortfolioSummaryRaw {
  positions?: Array<{
    evalAmountUsd?: number | string | null
    profitLossUsd?: number | string | null
  }>
  summary?: {
    totalAssetUsd?: number | string | null
    totalEvalProfit?: number | string | null
    totalReturnRate?: number | string | null
    totalAssetUsdActual?: number | string | null
    evalProfitUsdSum?: number | string | null
  }
}

export interface AggregatedPortfolio {
  totalAssetUsd: number       // KRW 총자산 합계
  marketValueUsd: number      // 포지션 USD 평가금액 합계
  usdDeposit: number          // USD 예수금 추정치 (KRW - posEval)
  totalEvalProfit: number     // KRW 평가손익 합계
  weightedReturnRate: number  // 가중평균 수익률
  totalAssetUsdActual: number // USD 총자산 (KIS: 포지션만, TOSS: 포지션+예수금)
  totalEvalProfitUsd: number  // USD 평가손익 합계
}

export function aggregatePortfolios(raws: (PortfolioSnapshot | null)[]): AggregatedPortfolio {
  let totalAssetUsd = 0
  let marketValueUsd = 0
  let totalEvalProfit = 0
  let weightedSum = 0
  let totalAssetUsdActual = 0
  let totalEvalProfitUsd = 0

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
    totalAssetUsdActual += toNum(r.summary?.totalAssetUsdActual)
    totalEvalProfitUsd += toNum(r.summary?.evalProfitUsdSum)
  }

  return {
    totalAssetUsd,
    marketValueUsd,
    usdDeposit: totalAssetUsd - marketValueUsd,
    totalEvalProfit,
    weightedReturnRate: marketValueUsd > 0 ? weightedSum / marketValueUsd : 0,
    totalAssetUsdActual,
    totalEvalProfitUsd,
  }
}
