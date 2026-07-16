import { apiFetch, fetchEither } from '@shared/lib/api-client'
import { toNum } from '@shared/lib/utils'
import type {
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

function buildDateQuery(params: { from?: string; to?: string }): string {
  const q = new URLSearchParams()
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  return q.size ? `?${q}` : ''
}

function buildCycleHistoryQuery(params: {
  from?: string
  to?: string
  cursor?: string
  size?: number
}): string {
  const q = new URLSearchParams()
  if (params.from) q.set('from', params.from)
  if (params.to) q.set('to', params.to)
  if (params.cursor) q.set('cursor', params.cursor)
  if (params.size != null) q.set('size', String(params.size))
  return q.size ? `?${q}` : ''
}

export async function getAccountCycleHistory(
  accountId: string,
  params: { from?: string; to?: string; cursor?: string; size?: number },
  token?: string
): Promise<CycleHistoryPage> {
  const qs = buildCycleHistoryQuery(params)
  return fetchEither<CycleHistoryPage>(`/api/accounts/${accountId}/cycle-history${qs}`, { method: 'GET' }, token)
}

export async function getStrategyCycleHistory(
  strategyId: string,
  params: { from?: string; to?: string; cursor?: string; size?: number },
  token?: string
): Promise<CycleHistoryPage> {
  const qs = buildCycleHistoryQuery(params)
  return fetchEither<CycleHistoryPage>(`/api/trading-cycles/${strategyId}/history${qs}`, { method: 'GET' }, token)
}

export async function getAccountPortfolio(accountId: string, token: string): Promise<PortfolioSummary> {
  const raw = await apiFetch<unknown>(`/api/accounts/${accountId}/portfolio`, { method: 'GET' }, token)
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
