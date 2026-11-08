import type { QueryClient } from '@tanstack/react-query'

import { accountKeys } from './queryKeys'

/** 전략 합산 예수금·평가금·미배정 예수금 캐시 무효화 — accountId를 모르면 전 계좌 */
export function invalidateLedgerTotals(queryClient: QueryClient, accountId?: string) {
  return queryClient
    .invalidateQueries({ queryKey: accountId ? accountKeys.ledgerTotals(accountId) : accountKeys.ledgerTotalsRoot() })
    .catch(() => null)
}
