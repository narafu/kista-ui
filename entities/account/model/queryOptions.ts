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
