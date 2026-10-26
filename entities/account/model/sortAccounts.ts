import { isMockBroker } from '@shared/lib/api-schema'
import type { Account } from './types'

// 모의계좌를 항상 뒤로 보낸다. 실계좌끼리·모의계좌끼리는 원래 순서(서버 등록 순)를 유지한다(Array.sort는 stable).
// useAccountsQuery의 select로 걸려 계좌를 나열하는 모든 화면이 이 순서를 따른다.
export function sortMockLast<T extends Pick<Account, 'broker'>>(accounts: readonly T[]): T[] {
  return [...accounts].sort((a, b) => Number(isMockBroker(a.broker)) - Number(isMockBroker(b.broker)))
}
