import { z } from 'zod'
import type { TradingMarket } from '@shared/lib/api-schema'
import { todayKst } from '@shared/lib/format'
import { STOCK_WEEKDAYS, type Strategy } from '@entities/strategy'

export const LAST_DAY = 'LAST' // 매월 말일 — payload에서 dayOfMonth null로 직렬화
export const DAY_OPTIONS = [...Array.from({ length: 31 }, (_, i) => String(i + 1)), LAST_DAY]
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

export const dcaFormSchema = z.object({
  market: z.enum(['US_STOCK', 'CRYPTO_KRW']), // 계좌 broker에서 정해지는 값 — 입력 필드가 아니다
  ticker: z.string().min(1, '종목을 선택하세요'),
  direction: z.enum(['BUY', 'SELL']),
  amount: z.number().positive('금액은 0보다 커야 합니다.').nullable()
    .refine((v): boolean => v != null, '금액을 입력하세요.'),
  orderType: z.enum(['MOO', 'MOC', 'MARKET']),
  executionHour: z.number().int().min(0).max(23).nullable(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']).nullable(),
  dayOfMonth: z.string().nullable(),
  scheduledStartDate: z.string().nullable(),
  conditions: z.array(conditionSchema).max(MAX_DCA_CONDITIONS, `조건은 최대 ${MAX_DCA_CONDITIONS}개입니다.`),
}).superRefine((v, ctx) => {
  // 등록 화면을 자정(KST) 넘겨 열어두면 기본값(오늘)이 어제가 된다 — 서버는 과거 날짜를 거부. 수정 모드는 null
  if (v.scheduledStartDate && v.scheduledStartDate < todayKst()) {
    ctx.addIssue({ code: 'custom', path: ['scheduledStartDate'], message: '시작예정일은 오늘 이후여야 합니다.' })
  }
  if (v.frequency === 'WEEKLY' && !v.dayOfWeek) {
    ctx.addIssue({ code: 'custom', path: ['dayOfWeek'], message: '요일을 선택하세요.' })
  }
  if (v.frequency === 'MONTHLY' && !v.dayOfMonth) {
    ctx.addIssue({ code: 'custom', path: ['dayOfMonth'], message: '날짜를 선택하세요.' })
  } else if (v.frequency === 'MONTHLY' && !DAY_OPTIONS.includes(v.dayOfMonth ?? '')) {
    ctx.addIssue({ code: 'custom', path: ['dayOfMonth'], message: '1~31일 또는 말일을 선택하세요.' })
  }
  if (v.market === 'CRYPTO_KRW') {
    if (v.orderType !== 'MARKET') ctx.addIssue({ code: 'custom', path: ['orderType'], message: '코인은 시장가 주문만 지원합니다.' })
    // 00시가 유효값이라 == null로 판정한다(truthy 검사 금지)
    if (v.executionHour == null) ctx.addIssue({ code: 'custom', path: ['executionHour'], message: '실행 시각을 선택하세요.' })
    if (v.amount != null && !Number.isInteger(v.amount)) {
      ctx.addIssue({ code: 'custom', path: ['amount'], message: '원 단위 정수로 입력하세요.' })
    } else if (v.amount != null && v.amount < MIN_CRYPTO_ORDER_KRW) {
      ctx.addIssue({ code: 'custom', path: ['amount'], message: '최소 주문 금액은 5,000원입니다.' })
    }
  } else {
    if (v.orderType === 'MARKET') ctx.addIssue({ code: 'custom', path: ['orderType'], message: '주문 방식을 선택하세요.' })
    if (v.frequency === 'WEEKLY' && v.dayOfWeek && !STOCK_WEEKDAYS.includes(v.dayOfWeek)) {
      ctx.addIssue({ code: 'custom', path: ['dayOfWeek'], message: '평일을 선택하세요.' })
    }
  }
})

export type DcaFormValues = z.infer<typeof dcaFormSchema>
export type DcaConditionFormValue = DcaFormValues['conditions'][number]

export function buildDcaFormDefaults(initial: Strategy | undefined, defaultTicker: string, market: TradingMarket): DcaFormValues {
  const d = initial?.dca
  const isCrypto = market === 'CRYPTO_KRW'
  if (!initial || !d) {
    return {
      market, ticker: defaultTicker, direction: 'BUY', amount: null,
      orderType: isCrypto ? 'MARKET' : 'MOC', executionHour: isCrypto ? DEFAULT_EXECUTION_HOUR : null,
      frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: LAST_DAY, scheduledStartDate: todayKst(), conditions: [],
    }
  }
  return {
    market,
    ticker: initial.ticker,
    direction: d.direction,
    amount: d.amount,
    orderType: d.orderType,
    executionHour: d.executionHour ?? (isCrypto ? DEFAULT_EXECUTION_HOUR : null),
    frequency: d.frequency,
    dayOfWeek: d.dayOfWeek,
    dayOfMonth: d.frequency === 'MONTHLY' ? (d.dayOfMonth == null ? LAST_DAY : String(d.dayOfMonth)) : null,
    scheduledStartDate: null,
    conditions: d.conditions.map((c) => ({
      indicator: c.indicator, operator: c.operator, threshold: c.threshold ?? null, smaPeriod: c.smaPeriod ?? null,
    })),
  }
}
