import { useMemo } from 'react'
import { isMockBroker } from '@shared/lib/api-schema'
import { useMeta } from '@entities/meta'
import { useAccountMarginQuery, useAccountPricesQuery } from '@entities/account'
import type { BrokerCode } from '@entities/account'
import { useMeQuery } from '@entities/user'
import { useRuntimeConfigQuery } from '@entities/runtime-config'
import type { RuntimeStrategyType } from '@entities/runtime-config'

export function useStrategyFormData(accountId: string, broker: BrokerCode | undefined) {
  const isMock = isMockBroker(broker)
  const { meta, findStrategyType } = useMeta()
  const runtimeQuery = useRuntimeConfigQuery()
  const runtimeConfig = runtimeQuery.data
  const enabledStrategyTypes = meta.strategyTypes
    .filter(({ code }) => runtimeConfig?.strategies[code as RuntimeStrategyType]?.enabled === true)
    .map(({ code }) => code)

  const { data: meData } = useMeQuery()
  // 모의계좌는 실제 잔고가 없어 예수금 조회 자체가 무의미 — 항상 수동 입력
  const balanceCheckEnabled = (meData?.balanceCheckEnabled ?? true) && !isMock

  // 잔고검증 OFF면 예수금 불필요 → margin 쿼리 skip
  // eslint-disable-next-line react-doctor/no-event-handler
  const { items: marginItems, isLoading: marginLoading } = useAccountMarginQuery(accountId, {
    enabled: balanceCheckEnabled,
  })

  // 티커 선택 버튼의 가격 표시용 — 여러 ticker 동시 (basePrice 계산엔 미사용)
  const allTickerCodes = useMemo(() => meta.tickers.map((t) => t.code), [meta.tickers])
  const { data: pricesData } = useAccountPricesQuery(accountId, allTickerCodes)
  const prices = pricesData ?? null

  return {
    isMock,
    meta,
    findStrategyType,
    runtimeQuery,
    runtimeConfig,
    enabledStrategyTypes,
    balanceCheckEnabled,
    marginItems,
    marginLoading,
    prices,
  }
}
