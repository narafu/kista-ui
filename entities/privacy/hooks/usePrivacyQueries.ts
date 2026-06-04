'use client'

import { useQuery } from '@tanstack/react-query'
import { getPrivacyCurrentBase } from '../api'

export function usePrivacyCurrentBaseQuery() {
  return useQuery({
    queryKey: ['privacyCurrentBase'],
    queryFn: () => getPrivacyCurrentBase().catch(() => null),
    retry: false,
  })
}
