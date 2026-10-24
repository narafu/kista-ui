import type { TradingMarket } from '@shared/lib/api-schema'
import type { OrderAmountRule } from '@entities/meta'
import type { MetaBundle } from '@entities/meta'

export const dcaTestMeta = {
  strategyTypes: [], tickers: [], brokers: [], strategyStatuses: [], cycleSeedTypes: [], assetClasses: [], markets: [],
  financeAccountTypes: [], financeCategoryTypes: [],
  orderTypes: [{ code: 'MOO', label: 'MOO(시가시장가)' }, { code: 'MOC', label: 'MOC(종가시장가)' }, { code: 'MARKET', label: 'MARKET(시장가)' }],
  orderDirections: [{ code: 'BUY', label: '매수' }, { code: 'SELL', label: '매도' }],
  dcaFrequencies: [{ code: 'DAILY', label: '매일' }, { code: 'WEEKLY', label: '매주' }, { code: 'MONTHLY', label: '매월' }],
  dcaOperators: [{ code: 'LTE', label: '이하' }, { code: 'LT', label: '미만' }, { code: 'GTE', label: '이상' }, { code: 'GT', label: '초과' }],
  dcaSkipReasons: [],
  dcaSizingTypes: [{ code: 'AMOUNT', label: '고정 금액' }, { code: 'HOLDING_PERCENT', label: '보유 비율' }],
  dcaShortfallPolicies: [{ code: 'PARTIAL', label: '가용만큼 주문' }, { code: 'REJECT', label: '주문하지 않음' }],
  dcaIndicators: [
    { code: 'AVG_PRICE', label: '평단가', smaPeriods: [] },
    { code: 'SMA', label: '이동평균선', smaPeriods: [20, 50, 120, 200] },
    { code: 'RSI', label: 'RSI(14)', smaPeriods: [] },
    { code: 'FEAR_GREED', label: '공포탐욕지수', smaPeriods: [] },
  ],
} satisfies MetaBundle

// 테스트 기본 금액 제약 — 업비트(5,000원 정수)와 주식(USD, 하한 없음)
export const testOrderAmount = (market: TradingMarket): OrderAmountRule =>
  market === 'CRYPTO_KRW' ? { min: 5000, scale: 0, currency: 'KRW' } : { min: 0, scale: 2, currency: 'USD' }
