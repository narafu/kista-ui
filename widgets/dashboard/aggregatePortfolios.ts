import { toNum } from '@shared/lib/utils'
import type { PortfolioSnapshot } from '@entities/trade'

interface PortfolioSummaryRaw {
  positions?: Array<{ evalAmountUsd?: number | string | null }>
  summary?: {
    totalAssetUsd?: number | string | null       // KRW 총자산
    totalEvalProfit?: number | string | null      // KRW 평가손익
    totalReturnRate?: number | string | null
    totalAssetUsdActual?: number | string | null
    evalProfitUsdSum?: number | string | null
    usdDeposit?: number | string | null           // USD 예수금
    posEvalUsd?: number | string | null           // USD 평가금
    exchangeRateKrwPerUsd?: number | string | null // 환율
  }
}

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
  raws: (PortfolioSnapshot | null)[],
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
    const r = raw as unknown as PortfolioSummaryRaw
    const account = accounts[i]

    const depositUsd = toNum(r.summary?.usdDeposit)
    const posEvalUsd = toNum(r.summary?.posEvalUsd)
    const assetUsd = depositUsd + posEvalUsd
    const evalProfit = toNum(r.summary?.totalEvalProfit)
    const returnRate = toNum(r.summary?.totalReturnRate)
    const evalProfitUsd = toNum(r.summary?.evalProfitUsdSum)
    const rate = toNum(r.summary?.exchangeRateKrwPerUsd)

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
