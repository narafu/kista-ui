import { toCurrency } from '@shared/lib/api-schema'
import { fetchEither } from '@shared/lib/api-client'
import { buildQueryString } from '@shared/lib/query-string'
import { toNum } from '@shared/lib/utils'
import type {
  CryptoPortfolio,
  CycleHistoryPage,
  DailyTransactionResult,
  PortfolioSummary,
} from '../model/types'

// KIS live 응답은 숫자 필드를 BigDecimal string으로 내려보내는 경우가 있어 entities 계층에서 정규화한다
function normalizePortfolio(raw: unknown): PortfolioSummary {
  const p = raw as {
    positions?: Array<Record<string, unknown>>
    summary?: Record<string, unknown>
  }
  const num = (v: unknown): number | null => (v != null ? toNum(v) : null)
  return {
    positions: p.positions?.map((pos) => ({
      ticker: pos.ticker as string | null | undefined,
      holdings: pos.holdings as number | null | undefined,
      exchangeCode: pos.exchangeCode as string | null | undefined,
      avgPrice: num(pos.avgPrice),
      currentPrice: num(pos.currentPrice),
      evalAmountUsd: num(pos.evalAmountUsd),
      profitLossUsd: num(pos.profitLossUsd),
      profitRate: num(pos.profitRate),
    })),
    summary: p.summary
      ? {
          totalAssetUsd: num(p.summary.totalAssetUsd),
          totalEvalProfit: num(p.summary.totalEvalProfit),
          totalReturnRate: num(p.summary.totalReturnRate),
          totalAssetUsdActual: num(p.summary.totalAssetUsdActual),
          evalProfitUsdSum: num(p.summary.evalProfitUsdSum),
          usdDeposit: num(p.summary.usdDeposit),
          posEvalUsd: num(p.summary.posEvalUsd),
          exchangeRateKrwPerUsd: num(p.summary.exchangeRateKrwPerUsd),
        }
      : undefined,
  }
}

export async function getAccountCycleHistory(
  accountId: string,
  params: { from?: string; to?: string; cursor?: string; size?: number },
  token?: string
): Promise<CycleHistoryPage> {
  const qs = buildQueryString(params)
  return fetchEither<CycleHistoryPage>(`/api/accounts/${accountId}/cycle-history${qs}`, { method: 'GET' }, token)
}

export async function getStrategyCycleHistory(
  strategyId: string,
  params: { from?: string; to?: string; cursor?: string; size?: number },
  token?: string
): Promise<CycleHistoryPage> {
  const qs = buildQueryString(params)
  return fetchEither<CycleHistoryPage>(`/api/trading-cycles/${strategyId}/history${qs}`, { method: 'GET' }, token)
}

export async function getAccountPortfolio(accountId: string, token?: string): Promise<PortfolioSummary> {
  const raw = await fetchEither<unknown>(`/api/accounts/${accountId}/portfolio`, { method: 'GET' }, token)
  return normalizePortfolio(raw)
}

// 유저 스코프 배치 조회 — 보유 계좌 전체를 계좌 구분 없이 합쳐 1회 요청으로 반환
export async function getDailyTransactionsBatch(
  params: { from: string; to: string },
  token?: string
): Promise<DailyTransactionResult> {
  const q = new URLSearchParams({ from: params.from, to: params.to })
  return fetchEither<DailyTransactionResult>(`/api/daily-trades?${q}`, { method: 'GET' }, token)
}

// krwCash·totalAssetKrw·evalAmountKrw는 deprecated(신규 필드와 같은 값) — 신규 필드가 없으면 폴백한다
interface CryptoPortfolioRaw {
  currency?: string | null
  cash?: number | string
  totalAsset?: number | string
  krwCash?: number | string
  totalAssetKrw?: number | string
  holdings?: Array<{
    ticker: string
    quantity: number | string
    avgBuyPrice: number | string | null
    currentPrice: number | string | null
    evalAmount?: number | string | null
    evalAmountKrw?: number | string | null
  }>
}

// 잔고와 무관한 거래소 공개 시세 — 시세가 없는 종목은 결과에서 빠진다
export async function getCryptoPrices(accountId: string, tickers: string[], token?: string): Promise<Record<string, number>> {
  const q = new URLSearchParams({ tickers: tickers.join(',') })
  const raw = await fetchEither<{ prices?: Array<{ ticker: string; price: number | string }> }>(`/api/accounts/${accountId}/crypto-prices?${q}`, { method: 'GET' }, token)
  return Object.fromEntries((raw.prices ?? []).map((p) => [p.ticker, toNum(p.price)]))
}

export async function getCryptoPortfolio(accountId: string, token?: string): Promise<CryptoPortfolio> {
  const raw = await fetchEither<CryptoPortfolioRaw>(`/api/accounts/${accountId}/crypto-portfolio`, { method: 'GET' }, token)
  return {
    currency: toCurrency(raw.currency) ?? 'KRW',
    cash: toNum(raw.cash ?? raw.krwCash),
    totalAsset: toNum(raw.totalAsset ?? raw.totalAssetKrw),
    holdings: (raw.holdings ?? []).map((h) => ({
      ticker: h.ticker,
      quantity: toNum(h.quantity),
      avgBuyPrice: h.avgBuyPrice == null ? null : toNum(h.avgBuyPrice),
      currentPrice: h.currentPrice == null ? null : toNum(h.currentPrice),
      evalAmount: toNum(h.evalAmount ?? h.evalAmountKrw),
    })),
  }
}
