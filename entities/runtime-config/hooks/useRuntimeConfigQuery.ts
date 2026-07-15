'use client'

import { useQuery } from '@tanstack/react-query'
import { getRuntimeConfig } from '../api'

export function useRuntimeConfigQuery() {
  return useQuery({
    queryKey: ['runtime-config'],
    queryFn: getRuntimeConfig,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}
