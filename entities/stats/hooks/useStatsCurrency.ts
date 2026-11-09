'use client'

import { useState } from 'react'
import { toCurrency, type Currency } from '@shared/lib/api-schema'
import { useStatsSummaryQuery } from './useStatsQueries'

/** 선택이 없으면 USD가 있으면 USD, 없으면 첫 통화 — 크립토만 가진 사용자가 빈 USD 화면을 보지 않게 한다 */
export function resolveStatsCurrency(selected: Currency | undefined, available: Currency[]): Currency {
  if (selected && available.includes(selected)) return selected
  return available.length === 0 || available.includes('USD') ? 'USD' : available[0]
}

/**
 * 통계·벤치마크 공통 합산 통화 선택. 통화 목록(availableCurrencies)은 요청 통화와 무관하므로 USD summary 캐시에서 읽는다.
 */
export function useStatsCurrency() {
  const [selected, setCurrency] = useState<Currency | undefined>(undefined)
  const { data } = useStatsSummaryQuery('USD')
  const options = (data?.availableCurrencies ?? []).map(toCurrency).filter((c): c is Currency => c != null)
  return { currency: resolveStatsCurrency(selected, options), options, setCurrency }
}
