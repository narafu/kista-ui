import { clientFetch } from './client'

export interface PrivacyCurrentBase {
  ticker: string
  currentCycleStart: number
  tradeDate: string
}

export async function getPrivacyCurrentBase(): Promise<PrivacyCurrentBase> {
  return clientFetch<PrivacyCurrentBase>('/api/privacy-trades/current-base')
}
