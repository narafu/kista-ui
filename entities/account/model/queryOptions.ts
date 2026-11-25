import { queryOptions } from '@tanstack/react-query'

import { getAccount, getAccountLedgerTotals, listAccounts, type AccountLedgerTotals } from '../api'
import { accountKeys } from './queryKeys'
import type { Account } from './types'

export function accountListQueryOptions(token?: string) {
  return queryOptions<Account[]>({
    queryKey: accountKeys.list(),
    queryFn: () => listAccounts(token),
  })
}

export function accountDetailQueryOptions(accountId: string, token?: string) {
  return queryOptions<Account | null>({
    queryKey: accountKeys.detail(accountId),
    queryFn: () => getAccount(accountId, token),
  })
}

export function accountLedgerTotalsQueryOptions(accountId: string, token?: string) {
  return queryOptions<AccountLedgerTotals>({
    queryKey: accountKeys.ledgerTotals(accountId),
    queryFn: () => getAccountLedgerTotals(accountId, token),
  })
}
