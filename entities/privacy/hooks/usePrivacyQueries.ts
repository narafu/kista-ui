'use client'

import { useQuery } from '@tanstack/react-query'
import { getPrivacyCurrentBase } from '../api'

export function usePrivacyCurrentBaseQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['privacyCurrentBase'],
    queryFn: () => getPrivacyCurrentBase().catch(() => null),
    retry: false,
    enabled: options?.enabled !== false,
  })
}
