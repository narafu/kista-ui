import type { MetaBundle, StrategyTypeMeta } from '../model/types'

// 로컬 kista-api `GET /api/meta` 응답(2026-10-24)의 enum 카테고리를 그대로 옮긴 테스트 공용 메타 — 서버 이름이 바뀌면 여기만 고친다.
// strategyTypes·tickers는 테스트마다 필요한 capability가 달라 각 테스트가 채운다
export const testMeta = {
  strategyTypes: [],
  tickers: [],
  brokers: [
    { code: 'TOSS', label: '토스증권', description: '토스', apiKeyExpirySource: 'ESTIMATED', enabled: true },
    { code: 'MOCK', label: '모의계좌', description: '모의', apiKeyExpirySource: 'NONE', enabled: true },
    { code: 'MERITZ', label: '메리츠증권', description: '메리츠', apiKeyExpirySource: 'ESTIMATED', enabled: true },
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
  ],
  orderTimings: [
    { code: 'AT_CLOSE', label: '장마감 30분 전 접수' },
    { code: 'AT_OPEN', label: '개장 선접수' },
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
  // 이하 kista-api S7 MetaEnumRegistry 라벨 그대로
  userStatuses: [
    { code: 'PENDING', label: '승인 대기' },
    { code: 'ACTIVE', label: '승인 완료' },
    { code: 'REJECTED', label: '반려' },
  ],
  userRoles: [
    { code: 'USER', label: '일반 사용자' },
    { code: 'ADMIN', label: '관리자' },
  ],
  recurringModes: [
    { code: 'DEPOSIT', label: '정기 적립' },
    { code: 'HOLD', label: '입출금 없음' },
    { code: 'WITHDRAW', label: '정기 인출' },
  ],
  currencies: [
    { code: 'KRW', label: '원화' },
    { code: 'USD', label: '미국 달러' },
    { code: 'JPY', label: '일본 엔' },
  ],
  apiKeyExpirySources: [
    { code: 'NONE', label: '만료 없음' },
    { code: 'ESTIMATED', label: '추정 만료일' },
  ],
  notificationChannels: [
    { code: 'NONE', label: '알림 없음' },
    { code: 'TELEGRAM', label: '텔레그램' },
    { code: 'FCM', label: '앱 푸시' },
    { code: 'ALL', label: '텔레그램 + 앱 푸시' },
  ],
  notificationTypes: [
    { code: 'TRADING_ALERT', label: '매매 알림' },
    { code: 'MARKET_ALERT', label: '시장 알림' },
    { code: 'FINANCE_REMINDER', label: '가계부 리마인더' },
  ],
  marketSessions: [
    { code: 'DIRECT', label: '주문 가능' },
    { code: 'BLOCKED', label: '주문 불가' },
  ],
  benchmarkAssetTypes: [
    { code: 'HOUSING', label: '주택' },
    { code: 'ETF', label: 'ETF' },
  ],
  etfBenchmarkSymbols: [
    { code: 'SPY', label: 'SPY', description: 'SPDR S&P 500 ETF Trust' },
    { code: 'QQQ', label: 'QQQ', description: 'Invesco QQQ Trust' },
    { code: 'QLD', label: 'QLD', description: 'ProShares Ultra QQQ (2x 레버리지)' },
    { code: 'IBIT', label: 'IBIT', description: 'iShares Bitcoin Trust' },
    { code: 'ETHA', label: 'ETHA', description: 'iShares Ethereum Trust' },
  ],
  financeInvitationStatuses: [
    { code: 'PENDING', label: '대기' },
    { code: 'ACCEPTED', label: '수락' },
    { code: 'DECLINED', label: '거절' },
    { code: 'EXPIRED', label: '만료' },
  ],
  nextOrdersSkipReasons: [
    { code: 'NO_CYCLE_HISTORY', label: '사이클 이력 없음' },
    { code: 'NO_PRIVACY_BASE', label: '기준매매표 미수신' },
    { code: 'SCHEDULED_START_NOT_REACHED', label: '시작예정일 미도래' },
    { code: 'CYCLE_ENDED', label: '사이클 종료' },
    { code: 'PRIVACY_BASE_BLOCKED', label: '기준매매표 점검 이슈로 차단' },
    { code: 'MARKET_CLOSED', label: '휴장일' },
  ],
  // 라벨을 소비하는 테스트가 아직 없어 비워 둔다
  strategyActions: [],
  strategyActionBlockReasons: [
    { code: 'ARCHIVED', label: '보관된 전략' },
    { code: 'ALREADY_PAUSED', label: '이미 일시중지됨' },
    { code: 'ALREADY_ACTIVE', label: '이미 운영 중' },
    { code: 'NO_ACTIVE_CYCLE', label: '진행 중인 사이클 없음' },
    { code: 'HAS_HOLDINGS', label: '보유 수량 있음' },
    { code: 'NO_WITHDRAWABLE_BALANCE', label: '인출 가능한 예수금 없음' },
  ],
  apiKeyExpiryStatuses: [
    { code: 'OK', label: '정상' },
    { code: 'EXPIRING', label: 'API 키 만료 임박' },
    { code: 'EXPIRED', label: 'API 키 재등록 필요' },
    { code: 'NONE', label: '만료일 없음' },
  ],
  orderPreviewWarningCodes: [
    { code: 'LEDGER_SHORTFALL', label: '전략 원장 예수금 부족' },
    { code: 'ACCOUNT_CASH_SHORTFALL', label: '계좌 예수금 부족' },
    { code: 'ACCOUNT_CASH_PARTIAL', label: '보정 주문 거절 가능' },
    { code: 'HOLDINGS_SHORTFALL', label: '보유 수량 부족' },
    { code: 'BUY_UNPLACED', label: '매수 미접수' },
    { code: 'SELL_UNPLACED', label: '매도 미접수' },
  ],
  strategyValidationWarningCodes: [],
  approvalRequired: false,
  benchmarkEtf: { allowedValues: ['SPY', 'QQQ', 'QLD', 'IBIT', 'ETHA'], defaultValue: 'SPY' },
} satisfies MetaBundle

// MetaProvider.labelOf와 같은 순서(label → description → code)로 찾는다
export function testLabelOf(category: keyof MetaBundle, code: string): string {
  const item = ((testMeta[category] ?? []) as { code: string; label?: string; description?: string }[]).find((i) => i.code === code)
  return item?.label ?? item?.description ?? code
}

export const strategyTypeMeta = (over: Partial<StrategyTypeMeta> = {}): StrategyTypeMeta => ({
  code: 'INFINITE', availableTickers: [], requiresPrivacyBase: false, tickerFixed: false, supportsReverseMode: false, divisionCounts: [],
  orderTypes: [], directions: [], frequencies: [], conditionIndicators: [],
  enabled: true, fields: { ticker: { customizable: true, allowedValues: [], defaultValue: '' } }, ...over,
})
