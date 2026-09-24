'use client'

import { useQuery } from '@tanstack/react-query'
import { getRuntimeConfig } from '../api'

export const runtimeConfigKeys = {
  all: ['runtime-config'] as const,
}

export function useRuntimeConfigQuery() {
  return useQuery({
    queryKey: runtimeConfigKeys.all,
    queryFn: getRuntimeConfig,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}
