import { isMockBroker } from '@shared/lib/api-schema'
import { useMeta } from '@entities/meta'
import type { BrokerCode } from '@entities/account'

export function useStrategyFormData(broker: BrokerCode | undefined) {
  const isMock = isMockBroker(broker)
  const { meta, findStrategyType, labelOf } = useMeta()
  // 메타에 있는 티커를 쓸 수 있는 유형만 — 유형별 availableTickers가 SSOT.
  // 숨겨진 유형이 기본 선택되지 않도록 활성 유형 자체를 거른다(폼 기본값이 첫 활성 유형을 고른다)
  const usableTypes = meta.strategyTypes.filter(({ enabled, availableTickers }) =>
    enabled
      && availableTickers.some((t) => meta.tickers.some((m) => m.code === t)))
  // 계좌 증권사가 supportedBrokers(빈 배열·누락 = 전체 허용)에 없으면 숨기고 안내만 남긴다 — 서버도 400으로 거절
  const brokerAllows = ({ supportedBrokers }: { supportedBrokers?: string[] }) =>
    !broker || !supportedBrokers?.length || supportedBrokers.includes(broker)
  const enabledStrategyTypes = usableTypes.filter(brokerAllows).map(({ code }) => code)
  const brokerRestrictionNotes = usableTypes.filter((t) => !brokerAllows(t)).map(({ code, supportedBrokers = [] }) => {
    const brokers = supportedBrokers.filter((b) => !isMockBroker(b)).map((b) => labelOf('brokers', b)).join('·')
    const label = labelOf('strategyTypes', code)
    // 라벨이 이미 "…전략"인 유형(P전략)은 "전략"을 덧붙이지 않는다
    return `${label.endsWith('전략') ? label : `${label} 전략`}은 ${brokers} 계좌에서만 등록할 수 있습니다.`
  })

  return {
    isMock,
    meta,
    findStrategyType,
    enabledStrategyTypes,
    brokerRestrictionNotes,
  }
}
