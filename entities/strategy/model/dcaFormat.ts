import { fmtMoney } from '@shared/lib/format'
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

// 주식은 미국 거래일 기준이라 주말 실행을 고를 수 없다
export const STOCK_WEEKDAYS: DcaWeekday[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

export function formatDcaSchedule(
  dca: Pick<DcaRuleRequest, 'frequency' | 'dayOfWeek' | 'dayOfMonth'>,
  frequencyLabel: string,
): string {
  return dca.frequency === 'WEEKLY' && dca.dayOfWeek
    ? `${frequencyLabel} ${WEEKDAY_LABEL[dca.dayOfWeek]}`
    : dca.frequency === 'MONTHLY'
      ? `${frequencyLabel} ${dca.dayOfMonth == null ? '말일' : `${dca.dayOfMonth}일`}`
      : frequencyLabel
}

// meta의 FEAR_GREED 라벨은 출처 중립('공포탐욕지수')이라 CNN 출처를 붙인다
export function dcaIndicatorLabel(code: string, metaLabel: string): string {
  return code === 'FEAR_GREED' ? `${metaLabel}(CNN)` : metaLabel
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

export type DcaRuleSummaryInput = Pick<DcaRuleRequest, 'direction' | 'frequency' | 'dayOfWeek' | 'dayOfMonth' | 'orderType' | 'sizing'>

// 금액은 주식 계좌 통화(USD)
export function formatDcaSizing(sizing: DcaSizing): string {
  return sizing.type === 'HOLDING_PERCENT'
    ? `보유 ${sizing.percent}%`
    : fmtMoney(sizing.amount ?? 0, 'USD')
}

// 주기 · 주문방식 — 규모를 뺀 앞부분
export function formatDcaRuleWhen(rule: DcaRuleSummaryInput, labelOf: DcaLabelOf): string {
  return [formatDcaSchedule(rule, labelOf('dcaFrequencies', rule.frequency)), labelOf('orderTypes', rule.orderType)].join(' · ')
}

// 날짜(kstTradeDate) 오름차순, 같은 날이면 앞 규칙 — nextExecution null 규칙은 제외
export function earliestNextExecution(rules: DcaRule[]): DcaRule | null {
  let best: DcaRule | null = null
  for (const r of rules) {
    if (!r.nextExecution) continue
    const b = best?.nextExecution
    const d = b ? r.nextExecution.kstTradeDate.localeCompare(b.kstTradeDate) : -1
    if (d < 0) best = r
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
