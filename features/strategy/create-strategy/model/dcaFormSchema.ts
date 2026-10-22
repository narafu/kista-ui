import { z } from 'zod'
import type { TradingMarket } from '@shared/lib/api-schema'
import { todayKst } from '@shared/lib/format'
import { STOCK_WEEKDAYS, type DcaRule, type Strategy } from '@entities/strategy'

export const LAST_DAY = 'LAST' // 매월 말일 — payload에서 dayOfMonth null로 직렬화
export const DAY_OPTIONS = [...Array.from({ length: 31 }, (_, i) => String(i + 1)), LAST_DAY]
export const MAX_DCA_RULES = 10 // kista-api 상한과 동일
export const MAX_DCA_CONDITIONS = 10 // kista-api 상한과 동일
export const MIN_CRYPTO_ORDER_KRW = 5000 // 업비트 최소 주문 금액
export const DEFAULT_EXECUTION_HOUR = 9 // 업비트 일봉 마감(09:00 KST) 직후

const conditionSchema = z.object({
  indicator: z.enum(['AVG_PRICE', 'SMA', 'RSI', 'FEAR_GREED']),
  operator: z.enum(['LTE', 'LT', 'GTE', 'GT']),
  threshold: z.number().nullable(),
  smaPeriod: z.number().int().nullable(),
}).superRefine((c, ctx) => {
  if (c.indicator === 'SMA') {
    if (c.smaPeriod == null) ctx.addIssue({ code: 'custom', path: ['smaPeriod'], message: '이동평균 기간을 선택하세요.' })
    return
  }
  if (c.threshold == null) {
    ctx.addIssue({ code: 'custom', path: ['threshold'], message: '기준값을 입력하세요.' })
    return
  }
  if ((c.indicator === 'RSI' || c.indicator === 'FEAR_GREED') && (c.threshold < 0 || c.threshold > 100)) {
    ctx.addIssue({ code: 'custom', path: ['threshold'], message: '0~100 사이로 입력하세요.' })
  }
  if (c.indicator === 'AVG_PRICE' && c.threshold <= -100) {
    ctx.addIssue({ code: 'custom', path: ['threshold'], message: '-100보다 큰 값을 입력하세요.' })
  }
  if (!/^-?\d+(\.\d{1,2})?$/.test(String(c.threshold))) {
    ctx.addIssue({ code: 'custom', path: ['threshold'], message: '소수 둘째 자리까지 입력하세요.' })
  }
})

export const dcaRuleSchema = z.object({
  market: z.enum(['US_STOCK', 'CRYPTO_KRW']), // 계좌 broker에서 정해지는 값 — 입력 필드가 아니다. 부모 폼이 각 규칙에 복사한다
  ruleKey: z.string().nullable(), // 수정 모드의 기존 규칙 식별자. 신규는 null
  direction: z.enum(['BUY', 'SELL']),
  orderType: z.enum(['MOO', 'MOC', 'MARKET']),
  executionHour: z.number().int().min(0).max(23).nullable(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']).nullable(),
  dayOfMonth: z.string().nullable(),
  sizingType: z.enum(['AMOUNT', 'HOLDING_PERCENT']),
  amount: z.number().nullable(),
  percent: z.number().nullable(),
  shortfall: z.enum(['PARTIAL', 'REJECT']),
  conditions: z.array(conditionSchema).max(MAX_DCA_CONDITIONS, `조건은 최대 ${MAX_DCA_CONDITIONS}개입니다.`),
}).superRefine((v, ctx) => {
  if (v.frequency === 'WEEKLY' && !v.dayOfWeek) {
    ctx.addIssue({ code: 'custom', path: ['dayOfWeek'], message: '요일을 선택하세요.' })
  }
  if (v.frequency === 'MONTHLY' && !v.dayOfMonth) {
    ctx.addIssue({ code: 'custom', path: ['dayOfMonth'], message: '날짜를 선택하세요.' })
  } else if (v.frequency === 'MONTHLY' && !DAY_OPTIONS.includes(v.dayOfMonth ?? '')) {
    ctx.addIssue({ code: 'custom', path: ['dayOfMonth'], message: '1~31일 또는 말일을 선택하세요.' })
  }
  const isCrypto = v.market === 'CRYPTO_KRW'
  if (isCrypto) {
    if (v.orderType !== 'MARKET') ctx.addIssue({ code: 'custom', path: ['orderType'], message: '크립토는 시장가 주문만 지원합니다.' })
    // 00시가 유효값이라 == null로 판정한다(truthy 검사 금지)
    if (v.executionHour == null) ctx.addIssue({ code: 'custom', path: ['executionHour'], message: '실행 시각을 선택하세요.' })
  } else {
    if (v.orderType === 'MARKET') ctx.addIssue({ code: 'custom', path: ['orderType'], message: '주문 방식을 선택하세요.' })
    if (v.frequency === 'WEEKLY' && v.dayOfWeek && !STOCK_WEEKDAYS.includes(v.dayOfWeek)) {
      ctx.addIssue({ code: 'custom', path: ['dayOfWeek'], message: '평일을 선택하세요.' })
    }
  }
  if (v.sizingType === 'HOLDING_PERCENT') {
    if (v.direction !== 'SELL') {
      ctx.addIssue({ code: 'custom', path: ['sizingType'], message: '보유 비율은 매도 규칙에서만 쓸 수 있습니다.' })
    }
    if (v.percent == null) {
      ctx.addIssue({ code: 'custom', path: ['percent'], message: '비율을 입력하세요.' })
    } else if (v.percent <= 0 || v.percent > 100) {
      ctx.addIssue({ code: 'custom', path: ['percent'], message: '0 초과 100 이하로 입력하세요.' })
    } else if (!/^\d+(\.\d{1,2})?$/.test(String(v.percent))) {
      ctx.addIssue({ code: 'custom', path: ['percent'], message: '소수 둘째 자리까지 입력하세요.' })
    }
    return
  }
  if (v.amount == null) {
    ctx.addIssue({ code: 'custom', path: ['amount'], message: '금액을 입력하세요.' })
  } else if (v.amount <= 0) {
    ctx.addIssue({ code: 'custom', path: ['amount'], message: '금액은 0보다 커야 합니다.' })
  } else if (isCrypto && !Number.isInteger(v.amount)) {
    ctx.addIssue({ code: 'custom', path: ['amount'], message: '원 단위 정수로 입력하세요.' })
  } else if (isCrypto && v.amount < MIN_CRYPTO_ORDER_KRW) {
    ctx.addIssue({ code: 'custom', path: ['amount'], message: '최소 주문 금액은 5,000원입니다.' })
  }
})

export const dcaFormSchema = z.object({
  market: z.enum(['US_STOCK', 'CRYPTO_KRW']),
  ticker: z.string().min(1, '종목을 선택하세요'),
  scheduledStartDate: z.string().nullable(),
  initialHoldings: z.number().nullable(), // 등록 시 보유 시작값 — 수정 모드는 항상 null(payload에 안 쓴다)
  initialAvgPrice: z.number().nullable(),
  rules: z.array(dcaRuleSchema)
    .min(1, '규칙을 추가하세요.')
    .max(MAX_DCA_RULES, `규칙은 최대 ${MAX_DCA_RULES}개입니다.`),
}).superRefine((v, ctx) => {
  // 등록 화면을 자정(KST) 넘겨 열어두면 기본값(오늘)이 어제가 된다 — 서버는 과거 날짜를 거부. 수정 모드는 null
  if (v.scheduledStartDate && v.scheduledStartDate < todayKst()) {
    ctx.addIssue({ code: 'custom', path: ['scheduledStartDate'], message: '시작예정일은 오늘 이후여야 합니다.' })
  }
  const { initialHoldings: q, initialAvgPrice: p } = v
  const decimals = v.market === 'CRYPTO_KRW' ? 8 : 0
  if (p != null && p < 0) {
    ctx.addIssue({ code: 'custom', path: ['initialAvgPrice'], message: '평단가는 0 이상이어야 합니다.' })
  }
  if (q != null && q < 0) {
    ctx.addIssue({ code: 'custom', path: ['initialHoldings'], message: '수량은 0 이상이어야 합니다.' })
  } else if (q != null && decimals === 0 && !Number.isInteger(q)) {
    ctx.addIssue({ code: 'custom', path: ['initialHoldings'], message: '수량은 정수여야 합니다.' })
  } else if (q != null && decimals > 0 && Math.round(q * 1e8) / 1e8 !== q) {
    ctx.addIssue({ code: 'custom', path: ['initialHoldings'], message: '소수 여덟째 자리까지 입력하세요.' })
  }
  if (q != null && q > 0 && (p == null || p <= 0)) {
    ctx.addIssue({ code: 'custom', path: ['initialAvgPrice'], message: '보유 수량을 입력하면 평단가는 0보다 커야 합니다.' })
  } else if (p != null && p > 0 && (q == null || q <= 0)) {
    ctx.addIssue({ code: 'custom', path: ['initialHoldings'], message: '평단가를 입력하면 수량은 0보다 커야 합니다.' })
  }
})

export type DcaRuleFormValues = z.infer<typeof dcaRuleSchema>
export type DcaFormValues = z.infer<typeof dcaFormSchema>
export type DcaConditionFormValue = DcaRuleFormValues['conditions'][number]

export function buildDcaRuleDefaults(direction: DcaRuleFormValues['direction'], market: TradingMarket): DcaRuleFormValues {
  const isCrypto = market === 'CRYPTO_KRW'
  return {
    market, ruleKey: null, direction,
    orderType: isCrypto ? 'MARKET' : 'MOC', executionHour: isCrypto ? DEFAULT_EXECUTION_HOUR : null,
    frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: LAST_DAY,
    sizingType: 'AMOUNT', amount: null, percent: null, shortfall: 'PARTIAL', conditions: [],
  }
}

function ruleToFormValue(r: DcaRule, market: TradingMarket): DcaRuleFormValues {
  return {
    market,
    ruleKey: r.ruleKey,
    direction: r.direction,
    orderType: r.orderType,
    executionHour: r.executionHour ?? (market === 'CRYPTO_KRW' ? DEFAULT_EXECUTION_HOUR : null),
    frequency: r.frequency,
    dayOfWeek: r.dayOfWeek,
    dayOfMonth: r.frequency === 'MONTHLY' ? (r.dayOfMonth == null ? LAST_DAY : String(r.dayOfMonth)) : null,
    sizingType: r.sizing.type,
    amount: r.sizing.amount,
    percent: r.sizing.percent,
    shortfall: r.shortfall,
    conditions: r.conditions.map((c) => ({
      indicator: c.indicator, operator: c.operator, threshold: c.threshold ?? null, smaPeriod: c.smaPeriod ?? null,
    })),
  }
}

export function buildDcaFormDefaults(initial: Strategy | undefined, defaultTicker: string, market: TradingMarket): DcaFormValues {
  const d = initial?.dca
  if (!initial || !d) {
    return {
      market, ticker: defaultTicker, scheduledStartDate: todayKst(), initialHoldings: null, initialAvgPrice: null, rules: [],
    }
  }
  return {
    market, ticker: initial.ticker, scheduledStartDate: null, initialHoldings: null, initialAvgPrice: null,
    rules: d.rules.map((r) => ruleToFormValue(r, market)),
  }
}
