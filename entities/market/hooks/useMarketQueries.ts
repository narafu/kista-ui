'use client'

import { useQuery } from '@tanstack/react-query'
import { getMonthlyHolidaysClient, getCandlesClient, getFearGreedClient } from '../api'
import type { Candle, FearGreed } from '../model/types'
import { CHART_CANDLE_COUNT } from '../model/constants'
import { marketKeys } from '../model/queryKeys'

export function useMonthlyHolidaysQuery(year: number, month: number, initialData?: string[]) {
  const { data: holidays = [], isFetching, isError } = useQuery<string[]>({
    queryKey: marketKeys.holidays(year, month),
    queryFn: () => getMonthlyHolidaysClient(year, month),
    initialData,
    initialDataUpdatedAt: initialData ? Date.now() : undefined,
    staleTime: initialData ? 1000 * 60 * 60 * 24 : 0, // 24시간 — 서버는 월 1회만 갱신
  })
  return { holidays, loading: isFetching, isError }
}

export function useCandlesQuery(ticker: string, count = CHART_CANDLE_COUNT) {
  return useQuery<Candle[]>({
    queryKey: marketKeys.candles(ticker, count),
    queryFn: () => getCandlesClient(ticker, count),
    staleTime: 1000 * 60 * 10,
  })
}

export function useFearGreedQuery(days = CHART_CANDLE_COUNT) {
  return useQuery<FearGreed>({
    queryKey: marketKeys.fearGreed(days),
    queryFn: () => getFearGreedClient(days),
    staleTime: 1000 * 60 * 60 * 6, // 6시간 — 서버 갱신 주기(KST 00:00/12:00, 12시간)의 절반
  })
}
