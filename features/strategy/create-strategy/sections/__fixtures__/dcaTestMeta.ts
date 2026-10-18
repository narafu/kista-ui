import type { MetaBundle } from '@entities/meta'

export const dcaTestMeta = {
  strategyTypes: [], tickers: [], brokers: [], strategyStatuses: [], cycleSeedTypes: [], assetClasses: [], markets: [],
  financeAccountTypes: [], financeCategoryTypes: [],
  orderTypes: [{ code: 'MOO', label: '장 시작 시장가' }, { code: 'MOC', label: '장 마감 시장가' }, { code: 'MARKET', label: 'MARKET' }],
  orderDirections: [{ code: 'BUY', label: '매수' }, { code: 'SELL', label: '매도' }],
  dcaFrequencies: [{ code: 'DAILY', label: '매일' }, { code: 'WEEKLY', label: '매주' }, { code: 'MONTHLY', label: '매월' }],
  dcaOperators: [{ code: 'LTE', label: '이하' }, { code: 'LT', label: '미만' }, { code: 'GTE', label: '이상' }, { code: 'GT', label: '초과' }],
  dcaSkipReasons: [],
  dcaIndicators: [
    { code: 'AVG_PRICE', label: '평단가', smaPeriods: [] },
    { code: 'SMA', label: '이동평균선', smaPeriods: [20, 50, 120, 200] },
    { code: 'RSI', label: 'RSI(14)', smaPeriods: [] },
    { code: 'FEAR_GREED', label: '공포탐욕지수', smaPeriods: [] },
  ],
} satisfies MetaBundle
