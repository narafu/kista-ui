'use client'

import { useQuery } from '@tanstack/react-query'
import { getRuntimeConfig } from '../api'
import { runtimeConfigKeys } from '../model/queryKeys'

export function useRuntimeConfigQuery() {
  return useQuery({
    queryKey: runtimeConfigKeys.all,
    queryFn: getRuntimeConfig,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}
