import { fmtMoney } from '@shared/lib/format'
import { isCryptoMarket, marketCurrency, type TradingMarket } from '@shared/lib/api-schema'
import type { DcaCondition, DcaRule, DcaRuleExecution, DcaRuleRequest, DcaSizing, DcaWeekday } from './types'

// java DayOfWeek 이름이라 메타에 없음 — 요일 한글명만 로컬 상수
export const WEEKDAY_LABEL: Record<DcaWeekday, string> = {
  MONDAY: '월요일',
  TUESDAY: '화요일',
  WEDNESDAY: '수요일',
  THURSDAY: '목요일',
  FRIDAY: '금요일',
  SATURDAY: '토요일',
  SUNDAY: '일요일',
}

// 주식은 미국 거래일 기준이라 주말 실행을 고를 수 없다. 코인은 24/7이라 7일 모두 고른다
export const STOCK_WEEKDAYS: DcaWeekday[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

export function formatExecutionHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}시`
}

// 코인 nextExecution은 KST 날짜(usSessionDate와 같음)라 실행 시각 executionHour를 붙여 "10/19 09시"로 표시한다
export function formatCryptoNextExecution(kstTradeDate: string | undefined, executionHour: number | null): string {
  if (!kstTradeDate) return '미정'
  const [, month, day] = kstTradeDate.split('-').map(Number)
  return executionHour == null ? `${month}/${day}` : `${month}/${day} ${formatExecutionHour(executionHour)}`
}

export function formatDcaSchedule(
  dca: Pick<DcaRuleRequest, 'frequency' | 'dayOfWeek' | 'dayOfMonth'> & { executionHour?: number | null },
  frequencyLabel: string,
): string {
  const day = dca.frequency === 'WEEKLY' && dca.dayOfWeek
    ? `${frequencyLabel} ${WEEKDAY_LABEL[dca.dayOfWeek]}`
    : dca.frequency === 'MONTHLY'
      ? `${frequencyLabel} ${dca.dayOfMonth == null ? '말일' : `${dca.dayOfMonth}일`}`
      : frequencyLabel
  return dca.executionHour == null ? day : `${day} ${formatExecutionHour(dca.executionHour)}`
}

// meta의 FEAR_GREED 라벨은 출처 중립('공포탐욕지수')이다 — 주식은 CNN, 코인은 alternative.me Crypto 지수라 출처를 붙인다
export function dcaIndicatorLabel(code: string, metaLabel: string, isCrypto: boolean): string {
  return code === 'FEAR_GREED' ? `${metaLabel}(${isCrypto ? 'Crypto' : 'CNN'})` : metaLabel
}

// 서버 검증상 SMA는 smaPeriod, 그 외는 threshold가 필수지만 응답 누락 시 'undefined' 노출 방지로 '-' 표기
export function formatDcaCondition(c: DcaCondition, indicatorLabel: string, operatorLabel: string): string {
  if (c.indicator === 'SMA') return `${indicatorLabel}(${c.smaPeriod ?? '-'}) ${operatorLabel}`
  if (c.threshold == null) return `${indicatorLabel} - ${operatorLabel}`
  if (c.indicator === 'AVG_PRICE') return `${indicatorLabel} ${c.threshold > 0 ? '+' : ''}${c.threshold}% ${operatorLabel}`
  return `${indicatorLabel} ${c.threshold} ${operatorLabel}`
}

// MetaProvider.labelOf(category: keyof MetaBundle)를 그대로 넘길 수 있게 필요한 카테고리만 좁힌 시그니처(파라미터 반공변)
export type DcaLabelOf = (category: 'orderDirections' | 'dcaFrequencies' | 'orderTypes' | 'dcaShortfallPolicies' | 'dcaSkipReasons', code: string) => string

export type DcaRuleSummaryInput = Pick<DcaRuleRequest, 'direction' | 'frequency' | 'dayOfWeek' | 'dayOfMonth' | 'orderType' | 'sizing'> & { executionHour?: number | null }

// 금액은 계좌 시장의 견적 통화(업비트 KRW, 바이낸스 USDT, 주식 USD)
export function formatDcaSizing(sizing: DcaSizing, market: TradingMarket): string {
  return sizing.type === 'HOLDING_PERCENT'
    ? `보유 ${sizing.percent}%`
    : fmtMoney(sizing.amount ?? 0, marketCurrency(market))
}

// "방향 · 주기[ 시각] · [주문방식 · ]규모" — 주문방식(MOO/MOC)은 주식만 시점으로 의미가 있다
export function formatDcaRuleSummary(rule: DcaRuleSummaryInput, labelOf: DcaLabelOf, market: TradingMarket): string {
  const isCrypto = isCryptoMarket(market)
  return [
    labelOf('orderDirections', rule.direction),
    formatDcaSchedule(rule, labelOf('dcaFrequencies', rule.frequency)),
    ...(isCrypto ? [] : [labelOf('orderTypes', rule.orderType)]),
    formatDcaSizing(rule.sizing, market),
  ].join(' · ')
}

// 날짜(kstTradeDate) 오름차순, 같으면 실행 시각 — nextExecution null 규칙은 제외
export function earliestNextExecution(rules: DcaRule[]): DcaRule | null {
  let best: DcaRule | null = null
  for (const r of rules) {
    if (!r.nextExecution) continue
    const b = best?.nextExecution
    const d = b ? r.nextExecution.kstTradeDate.localeCompare(b.kstTradeDate) : -1
    if (d < 0 || (d === 0 && (r.executionHour ?? 0) < (best?.executionHour ?? 0))) best = r
  }
  return best
}

export function latestLastExecution(rules: DcaRule[]): DcaRuleExecution | null {
  let best: DcaRuleExecution | null = null
  for (const r of rules) {
    if (r.lastExecution && (!best || r.lastExecution.kstTradeDate > best.kstTradeDate)) best = r.lastExecution
  }
  return best
}
