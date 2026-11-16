import { useMemo } from 'react'
import { isMockBroker } from '@shared/lib/api-schema'
import { isStockTicker, useMeta } from '@entities/meta'
import { useAccountPricesQuery } from '@entities/account'
import type { BrokerCode } from '@entities/account'
import { useRuntimeConfigQuery } from '@entities/runtime-config'
import type { RuntimeStrategyType } from '@entities/runtime-config'

export function useStrategyFormData(accountId: string, broker: BrokerCode | undefined) {
  const isMock = isMockBroker(broker)
  const { meta, findStrategyType } = useMeta()
  const runtimeQuery = useRuntimeConfigQuery()
  const runtimeConfig = runtimeQuery.data
  // 주식 티커를 쓸 수 있는 유형만 — 유형별 availableTickers가 SSOT.
  // 숨겨진 유형이 기본 선택되지 않도록 활성 유형 자체를 거른다(useTypeDefaults가 첫 활성 유형을 고른다)
  const enabledStrategyTypes = meta.strategyTypes.flatMap(({ code, availableTickers }) =>
    runtimeConfig?.strategies[code as RuntimeStrategyType]?.enabled === true
      && availableTickers.some((t) => isStockTicker(meta.tickers.find((m) => m.code === t)))
      ? [code] : [])

  // 티커 선택 버튼의 가격 표시용 — 주식 시세 api라 주식 티커만(api 상한 10개). basePrice 계산엔 미사용
  const allTickerCodes = useMemo(
    () => meta.tickers.filter((t) => isStockTicker(t)).map((t) => t.code),
    [meta.tickers],
  )
  const { data: pricesData, isError: pricesError } = useAccountPricesQuery(accountId, allTickerCodes)
  const prices = pricesData ?? null

  return {
    isMock,
    meta,
    findStrategyType,
    runtimeQuery,
    runtimeConfig,
    enabledStrategyTypes,
    prices,
    pricesError,
  }
}
