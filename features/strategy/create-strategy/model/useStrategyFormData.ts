import { useMemo } from 'react'
import { isMockBroker } from '@shared/lib/api-schema'
import { useMeta } from '@entities/meta'
import { useAccountPricesQuery } from '@entities/account'
import type { BrokerCode } from '@entities/account'
import type { RuntimeConfig } from '@entities/runtime-config'

export function useStrategyFormData(accountId: string, broker: BrokerCode | undefined) {
  const isMock = isMockBroker(broker)
  const { meta, findStrategyType, labelOf } = useMeta()
  // useTypeDefaults·strategyFormGuards(T10에서 삭제 예정)가 아직 RuntimeConfig 모양을 받아 meta를 그 모양으로 옮긴다 — 값은 meta가 SSOT.
  // useTypeDefaults가 [type, runtimeConfig] effect로 기본값을 채우므로 meta가 바뀔 때만 새 객체를 만든다
  const runtimeConfig = useMemo<RuntimeConfig>(() => ({
    auth: { approvalRequired: meta.approvalRequired },
    brokers: Object.fromEntries(meta.brokers.map(({ code, enabled }) => [code, { enabled }])) as RuntimeConfig['brokers'],
    strategies: Object.fromEntries(meta.strategyTypes.map(({ code, enabled, fields }) => [code, { enabled, fields }])) as RuntimeConfig['strategies'],
  }), [meta])
  // 메타에 있는 티커를 쓸 수 있는 유형만 — 유형별 availableTickers가 SSOT.
  // 숨겨진 유형이 기본 선택되지 않도록 활성 유형 자체를 거른다(useTypeDefaults가 첫 활성 유형을 고른다)
  const usableTypes = meta.strategyTypes.filter(({ enabled, availableTickers }) =>
    enabled
      && availableTickers.some((t) => meta.tickers.some((m) => m.code === t)))
  // 계좌 증권사가 supportedBrokers(빈 배열·누락 = 전체 허용)에 없으면 숨기고 안내만 남긴다 — 서버도 400으로 거절
  const brokerAllows = ({ supportedBrokers }: { supportedBrokers?: string[] }) =>
    !broker || !supportedBrokers?.length || supportedBrokers.includes(broker)
  const enabledStrategyTypes = usableTypes.filter(brokerAllows).map(({ code }) => code)
  const brokerRestrictionNotes = usableTypes.filter((t) => !brokerAllows(t)).map(({ code, supportedBrokers = [] }) => {
    const brokers = supportedBrokers.filter((b) => !isMockBroker(b)).map((b) => labelOf('brokers', b)).join('·')
    return `${labelOf('strategyTypes', code)} 전략은 ${brokers} 계좌에서만 등록할 수 있습니다.`
  })

  // 티커 선택 버튼의 가격 표시용(api 상한 10개). basePrice 계산엔 미사용
  const allTickerCodes = useMemo(
    () => meta.tickers.map((t) => t.code),
    [meta.tickers],
  )
  const { data: pricesData, isError: pricesError } = useAccountPricesQuery(accountId, allTickerCodes)
  const prices = pricesData ?? null

  return {
    isMock,
    meta,
    findStrategyType,
    runtimeConfig,
    enabledStrategyTypes,
    brokerRestrictionNotes,
    prices,
    pricesError,
  }
}
