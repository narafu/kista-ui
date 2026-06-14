import { toNum } from '@shared/lib/utils'
import type { PortfolioSummary } from '@entities/trade'

export interface PortfolioAccountEntry {
  accountId: string
  nickname: string
  usdDeposit: number    // 예수금 USD
  posEvalUsd: number    // 평가금 USD
  totalAssetUsd: number // 총자산 USD
}

export interface AggregatedPortfolio {
  totalDepositUsd: number      // 전체 예수금 USD
  totalPosEvalUsd: number      // 전체 평가금 USD
  totalAssetUsd: number        // 전체 총자산 USD (= totalDepositUsd + totalPosEvalUsd)
  exchangeRate: number         // 가중평균 환율
  accountEntries: PortfolioAccountEntry[]
  // 하위 호환 필드 (기존 코드 참조용)
  marketValueUsd: number       // = totalPosEvalUsd
  usdDeposit: number           // = totalDepositUsd
  totalEvalProfit: number      // KRW 평가손익 합계
  weightedReturnRate: number
  totalEvalProfitUsd: number
  totalAssetUsdActual: number  // = totalAssetUsd
}

export function aggregatePortfolios(
  raws: (PortfolioSummary | null)[],
  accounts: Array<{ id: string; nickname: string }> = [],
): AggregatedPortfolio {
  let totalDepositUsd = 0
  let totalPosEvalUsd = 0
  let totalEvalProfit = 0
  let weightedReturnSum = 0   // 수익률 × 평가금 가중합
  let totalEvalProfitUsd = 0
  let rateWeightedSum = 0     // 환율 × USD자산 가중합
  let rateWeightBase = 0      // 환율 가중평균 분모
  const accountEntries: PortfolioAccountEntry[] = []

  for (let i = 0; i < raws.length; i++) {
    const raw = raws[i]
    if (!raw) continue
    const account = accounts[i]

    const depositUsd = toNum(raw.summary?.usdDeposit)
    const posEvalUsd = toNum(raw.summary?.posEvalUsd)
    const assetUsd = depositUsd + posEvalUsd
    const evalProfit = toNum(raw.summary?.totalEvalProfit)
    const returnRate = toNum(raw.summary?.totalReturnRate)
    const evalProfitUsd = toNum(raw.summary?.evalProfitUsdSum)
    const rate = toNum(raw.summary?.exchangeRateKrwPerUsd)

    totalDepositUsd += depositUsd
    totalPosEvalUsd += posEvalUsd
    totalEvalProfit += evalProfit
    weightedReturnSum += posEvalUsd * returnRate
    totalEvalProfitUsd += evalProfitUsd
    rateWeightedSum += assetUsd * rate
    rateWeightBase += assetUsd

    if (account) {
      accountEntries.push({
        accountId: account.id,
        nickname: account.nickname,
        usdDeposit: depositUsd,
        posEvalUsd,
        totalAssetUsd: assetUsd,
      })
    }
  }

  const totalAssetUsd = totalDepositUsd + totalPosEvalUsd
  const exchangeRate = rateWeightBase > 0 ? rateWeightedSum / rateWeightBase : 0

  return {
    totalDepositUsd,
    totalPosEvalUsd,
    totalAssetUsd,
    exchangeRate,
    accountEntries,
    // 하위 호환
    marketValueUsd: totalPosEvalUsd,
    usdDeposit: totalDepositUsd,
    totalEvalProfit,
    weightedReturnRate: totalPosEvalUsd > 0 ? weightedReturnSum / totalPosEvalUsd : 0,
    totalEvalProfitUsd,
    totalAssetUsdActual: totalAssetUsd,
  }
}
