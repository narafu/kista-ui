'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getCandlesClient, getCandlesRangeClient, getCryptoMarketIndicatorsClient, getFearGreedClient } from '../api'
import type { Candle, CryptoMarketIndicators, FearGreed } from '../model/types'
import { CHART_CANDLE_COUNT } from '../model/constants'
import { marketKeys } from '../model/queryKeys'
import { monthlyHolidaysQueryOptions } from '../model/queryOptions'

// SSR prefetch(app/(main)/dashboard/page.tsx)가 monthlyHolidaysQueryOptions(...)로 채운 캐시를 그대로 소비한다.
// 실패한 서버 prefetch는 dehydrate에 포함되지 않으므로(react-query 기본 shouldDehydrateQuery가
// status:'success'만 직렬화) 여기서 바로 재조회된다 — "실패한 조회를 빈 달로 24시간 hydrate 금지" 시맨틱 보존.
export function useMonthlyHolidaysQuery(year: number, month: number) {
  const { data: holidays = [], isFetching, isError } = useQuery(monthlyHolidaysQueryOptions(year, month))
  return { holidays, loading: isFetching, isError }
}

export function useCandlesQuery(ticker: string, count = CHART_CANDLE_COUNT) {
  return useQuery<Candle[]>({
    queryKey: marketKeys.candles(ticker, count),
    queryFn: () => getCandlesClient(ticker, count),
    staleTime: 1000 * 60 * 10,
  })
}

export function useCandlesRangeQuery(ticker: string, range: { from: string; to: string } | null) {
  return useQuery<Candle[]>({
    queryKey: marketKeys.candlesRange(ticker, range?.from ?? '', range?.to ?? ''),
    queryFn: () => (range ? getCandlesRangeClient(ticker, range.from, range.to) : Promise.resolve([])),
    enabled: range != null,
    staleTime: 1000 * 60 * 10,
  })
}

export function useFearGreedQuery(days = CHART_CANDLE_COUNT) {
  return useQuery<FearGreed>({
    queryKey: marketKeys.fearGreed(days),
    queryFn: () => getFearGreedClient(days),
    staleTime: 1000 * 60 * 60 * 6, // 6시간 — 서버 갱신 주기(KST 00:00/12:00, 12시간)의 절반
    // 일수 토글 시 새 키를 받는 동안 이전 차트를 유지해 "데이터 없음"이 깜빡이지 않게 한다
    placeholderData: keepPreviousData,
  })
}

// 비인증 공개 엔드포인트 — 게스트도 조회한다(공포탐욕지수와 같은 대시보드 공개 패널)
export function useCryptoMarketIndicatorsQuery() {
  return useQuery<CryptoMarketIndicators>({
    queryKey: marketKeys.cryptoIndicators(),
    queryFn: getCryptoMarketIndicatorsClient,
    staleTime: 1000 * 60 * 10, // 10분 — kista-trading 서버 캐시 TTL과 같다(프록시는 Cache-Control을 전달하지 않는다)
  })
}
