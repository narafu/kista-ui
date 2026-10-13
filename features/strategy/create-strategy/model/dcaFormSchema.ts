import { z } from 'zod'
import type { Strategy } from '@entities/strategy'

export const LAST_DAY = 'LAST' // 매월 말일 — payload에서 dayOfMonth null로 직렬화
export const DAY_OPTIONS = [...Array.from({ length: 31 }, (_, i) => String(i + 1)), LAST_DAY]
export const MAX_DCA_CONDITIONS = 10 // kista-api 상한과 동일

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
  ticker: z.string().min(1, '종목을 선택하세요'),
  direction: z.enum(['BUY', 'SELL']),
  amountUsd: z.number().positive('금액은 0보다 커야 합니다.').nullable()
    .refine((v): boolean => v != null, '금액을 입력하세요.'),
  orderType: z.enum(['MOO', 'MOC']),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']).nullable(),
  dayOfMonth: z.string().nullable(),
  scheduledStartDate: z.string().nullable(),
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
})

export type DcaFormValues = z.infer<typeof dcaFormSchema>
export type DcaConditionFormValue = DcaFormValues['conditions'][number]

export function buildDcaFormDefaults(initial: Strategy | undefined, defaultTicker: string): DcaFormValues {
  const d = initial?.dca
  if (!initial || !d) {
    return {
      ticker: defaultTicker, direction: 'BUY', amountUsd: null, orderType: 'MOC', frequency: 'MONTHLY',
      dayOfWeek: null, dayOfMonth: LAST_DAY, scheduledStartDate: null, conditions: [],
    }
  }
  return {
    ticker: initial.ticker,
    direction: d.direction,
    amountUsd: d.amountUsd,
    orderType: d.orderType,
    frequency: d.frequency,
    dayOfWeek: d.dayOfWeek,
    dayOfMonth: d.frequency === 'MONTHLY' ? (d.dayOfMonth == null ? LAST_DAY : String(d.dayOfMonth)) : null,
    scheduledStartDate: null,
    conditions: d.conditions.map((c) => ({
      indicator: c.indicator, operator: c.operator, threshold: c.threshold ?? null, smaPeriod: c.smaPeriod ?? null,
    })),
  }
}
