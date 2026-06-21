import { apiFetch, clientFetch, fetchEither, jsonBody } from '@shared/lib/api-client'
import { toNum } from '@shared/lib/utils'
import type { Account, AccountRequest } from '../model/types'

export interface MarginItem {
  currency: string
  integratedOrderableAmount: number
  foreignOrderableAmount: number
  purchasableAmount: number
}

export type PriceMap = Record<string, number>

export async function listAccounts(token: string): Promise<Account[]> {
  return apiFetch<Account[]>('/api/accounts', { method: 'GET' }, token)
}

export async function createAccount(data: AccountRequest, token?: string): Promise<Account> {
  return fetchEither<Account>('/api/accounts', jsonBody('POST', data), token)
}

export async function updateAccount(id: string, data: AccountRequest, token?: string): Promise<Account> {
  return fetchEither<Account>(`/api/accounts/${id}`, jsonBody('PUT', data), token)
}

export async function deleteAccount(id: string, token?: string): Promise<void> {
  return fetchEither<void>(`/api/accounts/${id}`, { method: 'DELETE' }, token)
}

export async function getMargin(accountId: string): Promise<MarginItem[]> {
  return clientFetch<MarginItem[]>(`/api/accounts/${accountId}/margin`)
}

interface MultiPriceResponseRaw {
  prices: Array<{ ticker: string; price: number | string }>
}

export async function getPrices(accountId: string, tickers: string[]): Promise<PriceMap> {
  const query = tickers.map(t => `tickers=${encodeURIComponent(t)}`).join('&')
  const raw = await clientFetch<MultiPriceResponseRaw>(`/api/accounts/${accountId}/prices?${query}`)
  return Object.fromEntries(raw.prices.map(({ ticker, price }) => [ticker, toNum(price)]))
}

export async function testKisConnection(appKey: string, appSecret: string): Promise<void> {
  await clientFetch<void>('/api/accounts/connection-tests', jsonBody('POST', { appKey, appSecret }))
}
