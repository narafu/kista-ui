import { queryOptions } from '@tanstack/react-query'

import { detailFromListQueryOptions } from '@shared/lib/query'
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
  return detailFromListQueryOptions<Account>(
    accountKeys.detail(accountId),
    () => listAccounts(token),
    accountId,
  )
}
