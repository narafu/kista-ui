import { clientFetch, fetchEither, jsonBody } from '@shared/lib/api-client'
import { toNum } from '@shared/lib/utils'
import type { Account, AccountRequest } from '../model/types'

export type PriceMap = Record<string, number>

export async function listAccounts(token?: string): Promise<Account[]> {
  return fetchEither<Account[]>('/api/accounts', { method: 'GET' }, token)
}

export async function createAccount(data: AccountRequest, token?: string): Promise<Account> {
  return fetchEither<Account>('/api/accounts', jsonBody('POST', data), token)
}

export async function updateAccount(id: string, data: AccountRequest, token?: string): Promise<Account> {
  return fetchEither<Account>(`/api/accounts/${id}`, jsonBody('PUT', data), token)
}

// 응답은 갱신된 계좌(apiKeyExpiresAt 포함). 서버가 연결 테스트를 통과해야 저장한다
export async function updateCredentials(id: string, body: { appKey: string; secretKey: string }): Promise<Account> {
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

export async function testKisConnection(appKey: string, appSecret: string, broker?: string): Promise<void> {
  await clientFetch<void>('/api/accounts/connection-tests', jsonBody('POST', { broker, appKey, appSecret }))
}
