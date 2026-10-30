import { useMemo } from 'react'
import { brokerMarket, isCryptoBroker, isMockBroker } from '@shared/lib/api-schema'
import { tickerTradesIn, useMeta } from '@entities/meta'
import { useAccountPricesQuery } from '@entities/account'
import type { BrokerCode } from '@entities/account'
import { useRuntimeConfigQuery } from '@entities/runtime-config'
import type { RuntimeStrategyType } from '@entities/runtime-config'

export function useStrategyFormData(accountId: string, broker: BrokerCode | undefined) {
  const isMock = isMockBroker(broker)
  // 코인 계좌로 주식 prices를 부르면 400 — StrategyForm은 DCA 분기 전에 이 훅을 부르므로 여기서 막는다
  const isCrypto = isCryptoBroker(broker)
  const market = brokerMarket(broker)
  const { meta, findStrategyType } = useMeta()
  const runtimeQuery = useRuntimeConfigQuery()
  const runtimeConfig = runtimeQuery.data
  // 코인 계좌는 코인 티커를 쓸 수 있는 유형만, 주식 계좌는 주식 티커를 쓸 수 있는 유형만 — 유형별 availableTickers가 SSOT.
  // 숨겨진 유형이 기본 선택되지 않도록 활성 유형 자체를 시장으로 거른다(useTypeDefaults가 첫 활성 유형을 고른다)
  const enabledStrategyTypes = meta.strategyTypes.flatMap(({ code, availableTickers }) =>
    runtimeConfig?.strategies[code as RuntimeStrategyType]?.enabled === true
      && availableTickers.some((t) => tickerTradesIn(meta.tickers.find((m) => m.code === t), market))
      ? [code] : [])

  // 티커 선택 버튼의 가격 표시용 — 주식 시세 api라 코인 티커는 뺀다(api 상한 10개). basePrice 계산엔 미사용
  const allTickerCodes = useMemo(
    () => meta.tickers.filter((t) => tickerTradesIn(t, 'US_STOCK')).map((t) => t.code),
    [meta.tickers],
  )
  const { data: pricesData, isError: pricesError } = useAccountPricesQuery(accountId, allTickerCodes, { enabled: !isCrypto })
  const prices = pricesData ?? null

  return {
    isMock,
    isCrypto,
    market,
    meta,
    findStrategyType,
    runtimeQuery,
    runtimeConfig,
    enabledStrategyTypes,
    prices,
    pricesError,
  }
}
