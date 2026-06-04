'use client'

import { useQuery } from '@tanstack/react-query'
import { getMonthlyHolidaysClient, getMarketSession } from '../api'

export function useMonthlyHolidaysQuery(year: number, month: number, initialData?: string[]) {
  const { data: holidays = [], isFetching } = useQuery<string[]>({
    queryKey: ['holidays', year, month],
    queryFn: () => getMonthlyHolidaysClient(year, month).catch((): string[] => []),
    initialData,
    initialDataUpdatedAt: initialData ? Date.now() : undefined,
    staleTime: initialData ? 1000 * 60 * 60 : 0,
  })
  return { holidays, loading: isFetching }
}

export function useMarketSessionQuery() {
  return useQuery({
    queryKey: ['marketSession'],
    queryFn: () => getMarketSession().catch(() => null),
    staleTime: 1000 * 60,
  })
}
