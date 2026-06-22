'use client'

import { useQuery } from '@tanstack/react-query'
import { getMonthlyHolidaysClient, getMarketSession, getCandlesClient, getFearGreedClient } from '../api'
import type { Candle, FearGreed } from '../model/types'
import { CHART_CANDLE_COUNT } from '../model/constants'

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

export function useCandlesQuery(ticker: string, count = CHART_CANDLE_COUNT) {
  return useQuery<Candle[]>({
    queryKey: ['candles', ticker, count],
    queryFn: () => getCandlesClient(ticker, count).catch((): Candle[] => []),
    staleTime: 1000 * 60 * 10,
  })
}

export function useFearGreedQuery(days = CHART_CANDLE_COUNT) {
  return useQuery<FearGreed | null>({
    queryKey: ['fearGreed', days],
    queryFn: () => getFearGreedClient(days).catch((): FearGreed | null => null),
    staleTime: 1000 * 60 * 30, // 30분 — 하루 1회 갱신 데이터
  })
}
