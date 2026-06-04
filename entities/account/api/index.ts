import { apiFetch, clientFetch } from '@shared/lib/api-client'
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
  if (token) return apiFetch<Account>('/api/accounts', { method: 'POST', body: JSON.stringify(data) }, token)
  return clientFetch<Account>('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateAccount(id: string, data: AccountRequest, token?: string): Promise<Account> {
  if (token) return apiFetch<Account>(`/api/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }, token)
  return clientFetch<Account>(`/api/accounts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteAccount(id: string, token?: string): Promise<void> {
  if (token) return apiFetch<void>(`/api/accounts/${id}`, { method: 'DELETE' }, token)
  await clientFetch<void>(`/api/accounts/${id}`, { method: 'DELETE' })
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
  return Object.fromEntries(
    raw.prices.map(({ ticker, price }) => [ticker, typeof price === 'string' ? parseFloat(price) : price])
  )
}

export interface KisConnectionResult {
  success: boolean
  message?: string
}

export async function testKisConnection(appKey: string, appSecret: string): Promise<KisConnectionResult> {
  return clientFetch<KisConnectionResult>('/api/accounts/connection-tests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appKey, appSecret }),
  })
}
