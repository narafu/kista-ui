import { ApiError, clientFetch, fetchEither, jsonBody } from '@shared/lib/api-client'
import { toNum } from '@shared/lib/utils'
import type { Currency } from '@shared/lib/api-schema'
import type { Account, AccountRequest, CredentialsRequest } from '../model/types'

export type PriceMap = Record<string, number>

/** 계좌 원장 합산 — 금액은 모두 계좌 통화. evaluation은 시세·잔고 조회 실패 시 null */
export interface AccountLedgerTotals {
  currency: Currency
  deposit: number
  evaluation: number | null
}

export async function listAccounts(token?: string): Promise<Account[]> {
  return fetchEither<Account[]>('/api/accounts', { method: 'GET' }, token)
}

// 없는 계좌(404)는 null — 호출부가 notFound로 분기한다. 그 외 실패는 던진다
export async function getAccount(id: string, token?: string): Promise<Account | null> {
  try {
    return await fetchEither<Account>(`/api/accounts/${id}`, { method: 'GET' }, token)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  }
}

export async function createAccount(data: AccountRequest, token?: string): Promise<Account> {
  return fetchEither<Account>('/api/accounts', jsonBody('POST', data), token)
}

export async function updateAccount(id: string, data: AccountRequest, token?: string): Promise<Account> {
  return fetchEither<Account>(`/api/accounts/${id}`, jsonBody('PUT', data), token)
}

// 응답은 갱신된 계좌(apiKeyExpiresAt 포함). 서버가 연결 테스트를 통과해야 저장한다
export async function updateCredentials(id: string, body: CredentialsRequest): Promise<Account> {
  return clientFetch<Account>(`/api/accounts/${id}/credentials`, jsonBody('PUT', body))
}

export async function deleteAccount(id: string, token?: string): Promise<void> {
  return fetchEither<void>(`/api/accounts/${id}`, { method: 'DELETE' }, token)
}

interface MultiPriceResponseRaw {
  prices: Array<{ ticker: string; price: number | string }>
}

export async function getPrices(accountId: string, tickers: string[]): Promise<PriceMap> {
  const query = tickers.map(t => `tickers=${encodeURIComponent(t)}`).join('&')
  const raw = await clientFetch<MultiPriceResponseRaw>(`/api/accounts/${accountId}/prices?${query}`)
  return Object.fromEntries(raw.prices.map(({ ticker, price }) => [ticker, toNum(price)]))
}

export async function testBrokerConnection(appKey: string, appSecret: string, broker?: string): Promise<void> {
  await clientFetch<void>('/api/accounts/connection-tests', jsonBody('POST', { broker, appKey, appSecret }))
}

interface AccountLedgerTotalsRaw {
  currency: Currency
  deposit: number | string
  evaluation: number | string | null
}

export async function getAccountLedgerTotals(accountId: string, token?: string): Promise<AccountLedgerTotals> {
  const raw = await fetchEither<AccountLedgerTotalsRaw>(`/api/accounts/${accountId}/ledger-totals`, { method: 'GET' }, token)
  return {
    currency: raw.currency,
    deposit: toNum(raw.deposit),
    evaluation: raw.evaluation == null ? null : toNum(raw.evaluation),
  }
}
