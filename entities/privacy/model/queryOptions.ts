import { queryOptions } from '@tanstack/react-query'

import { listAdminPrivacyBases } from '../api'
import { privacyKeys } from './queryKeys'
import type { AdminPrivacyBase } from './types'

export function adminPrivacyBasesQueryOptions(token?: string) {
  return queryOptions<AdminPrivacyBase[]>({
    queryKey: privacyKeys.list(),
    queryFn: () => listAdminPrivacyBases(token),
  })
}
