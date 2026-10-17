import { queryOptions } from '@tanstack/react-query'

import { getMe } from '../api'
import { userKeys } from './queryKeys'
import type { User } from './types'

export function meQueryOptions(token?: string) {
  return queryOptions<User>({
    queryKey: userKeys.me(),
    queryFn: () => getMe(token),
    staleTime: 60_000,
  })
}
