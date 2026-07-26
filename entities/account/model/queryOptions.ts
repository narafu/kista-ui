import { queryOptions } from '@tanstack/react-query'

import { listAccounts } from '../api'
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
    queryFn: async () => {
      const accounts = await listAccounts(token)
      return accounts.find((account) => account.id === accountId) ?? null
    },
  })
}
