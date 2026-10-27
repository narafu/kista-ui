import type { MetaBundle } from '../model/types'

// 로컬 kista-api `GET /api/meta` 응답(2026-10-24)의 enum 카테고리를 그대로 옮긴 테스트 공용 메타 — 서버 이름이 바뀌면 여기만 고친다.
// strategyTypes·tickers는 테스트마다 필요한 capability가 달라 각 테스트가 채운다
export const testMeta = {
  strategyTypes: [],
  tickers: [],
  brokers: [
    { code: 'TOSS', label: '토스증권', description: '토스', market: 'US_STOCK', currency: 'USD', minOrderAmount: '0', amountScale: 2 },
    { code: 'KIS', label: '한국투자증권', description: '한투', market: 'US_STOCK', currency: 'USD', minOrderAmount: '0', amountScale: 2 },
    { code: 'MOCK', label: '모의계좌', description: '모의', market: 'US_STOCK', currency: 'USD', minOrderAmount: '0', amountScale: 2 },
    { code: 'UPBIT', label: '업비트', description: '업비트', market: 'CRYPTO_KRW', currency: 'KRW', minOrderAmount: '5000', amountScale: 0 },
    { code: 'MERITZ', label: '메리츠증권', description: '메리츠', market: 'US_STOCK', currency: 'USD', minOrderAmount: '0', amountScale: 2 },
    { code: 'BINANCE', label: '바이낸스', description: '바이낸스', market: 'CRYPTO_USDT', currency: 'USDT', minOrderAmount: '5', amountScale: 2 },
  ],
  strategyStatuses: [
    { code: 'ACTIVE', label: '운영중' },
    { code: 'PAUSED', label: '일시중지' },
  ],
  cycleSeedTypes: [
    { code: 'NONE', label: '연속 안 함' },
    { code: 'MAINTAIN', label: '투자금 유지' },
    { code: 'MAX', label: '투자금 MAX' },
  ],
  assetClasses: [
    { code: 'CASH', label: '현금성' },
    { code: 'EQUITY', label: '주식' },
    { code: 'FIXED_INCOME', label: '채권' },
    { code: 'COMMODITY', label: '원자재' },
    { code: 'CRYPTO', label: '크립토' },
    { code: 'REAL_ESTATE', label: '부동산' },
  ],
  markets: [
    { code: 'DOMESTIC', label: '국내' },
    { code: 'GLOBAL', label: '해외' },
  ],
  financeAccountTypes: [
    { code: 'SECURITIES', label: '증권사' },
    { code: 'BANK', label: '은행' },
    { code: 'INSURANCE', label: '보험' },
    { code: 'EXCHANGE', label: '거래소' },
  ],
  financeCategoryTypes: [
    { code: 'INCOME', label: '수입' },
    { code: 'EXPENSE', label: '소비' },
    { code: 'SAVING', label: '저축' },
    { code: 'ASSET', label: '자산' },
  ],
  orderTypes: [
    { code: 'LOC', label: 'LOC(종가지정가)' },
    { code: 'MOC', label: 'MOC(종가시장가)' },
    { code: 'LIMIT', label: 'LIMIT(지정가)' },
    { code: 'MOO', label: 'MOO(시가시장가)' },
    { code: 'MARKET', label: 'MARKET(시장가)' },
  ],
  orderTimings: [
    { code: 'AT_CLOSE', label: '장마감 30분 전 접수' },
    { code: 'AT_OPEN', label: '개장 선접수' },
    { code: 'IMMEDIATE', label: '즉시 접수' },
  ],
  orderDirections: [
    { code: 'BUY', label: '매수' },
    { code: 'SELL', label: '매도' },
  ],
  dcaFrequencies: [
    { code: 'DAILY', label: '매일' },
    { code: 'WEEKLY', label: '매주' },
    { code: 'MONTHLY', label: '매월' },
  ],
  dcaOperators: [
    { code: 'LTE', label: '이하' },
    { code: 'LT', label: '미만' },
    { code: 'GTE', label: '이상' },
    { code: 'GT', label: '초과' },
  ],
  dcaSkipReasons: [
    { code: 'DATA_UNAVAILABLE', label: '데이터 확보 실패' },
    { code: 'CONDITION_NOT_MET', label: '조건 미충족' },
    { code: 'NO_HOLDINGS', label: '보유 수량 없음' },
    { code: 'INSUFFICIENT_HOLDINGS', label: '보유 수량 부족' },
    { code: 'INSUFFICIENT_BALANCE', label: '예수금 부족' },
    { code: 'BELOW_ONE_SHARE', label: '1주 미만 금액' },
    { code: 'BELOW_MIN_ORDER_AMOUNT', label: '최소 주문 금액 미달' },
    { code: 'EXCHANGE_API_ERROR', label: '거래소 API 오류' },
    { code: 'API_KEY_EXPIRED', label: 'API 키 인증 실패' },
  ],
  dcaSizingTypes: [
    { code: 'AMOUNT', label: '고정 금액' },
    { code: 'HOLDING_PERCENT', label: '보유 비율' },
  ],
  dcaShortfallPolicies: [
    { code: 'PARTIAL', label: '가용만큼 주문' },
    { code: 'REJECT', label: '주문하지 않음' },
  ],
  dcaIndicators: [
    { code: 'AVG_PRICE', label: '평단가', description: '전일 종가 vs 평단가 × (1 + n%)', smaPeriods: [] },
    { code: 'SMA', label: '이동평균선', description: '전일 종가 vs SMA(기간)', smaPeriods: [20, 50, 120, 200] },
    { code: 'RSI', label: 'RSI(14)', description: 'RSI(14) vs 기준값(0~100)', smaPeriods: [] },
    { code: 'FEAR_GREED', label: '공포탐욕지수', description: '공포탐욕지수 vs 기준값(0~100)', smaPeriods: [] },
  ],
  orderStatuses: [
    { code: 'PLANNED', label: '예정' },
    { code: 'SUBMITTING', label: '접수 중' },
    { code: 'PLACED', label: '접수' },
    { code: 'FILLED', label: '체결' },
    { code: 'PARTIALLY_FILLED', label: '부분체결' },
    { code: 'FAILED', label: '실패' },
    { code: 'CANCELLED', label: '취소' },
  ],
  dcaExecutionStatuses: [
    { code: 'ORDERED', label: '주문됨' },
    { code: 'SKIPPED', label: '건너뜀' },
  ],
} satisfies MetaBundle

// MetaProvider.labelOf와 같은 순서(label → description → code)로 찾는다
export function testLabelOf(category: keyof MetaBundle, code: string): string {
  const item = ((testMeta[category] ?? []) as { code: string; label?: string; description?: string }[]).find((i) => i.code === code)
  return item?.label ?? item?.description ?? code
}
