import type { DcaCondition, DcaConfigRequest, DcaWeekday } from './types'

// java DayOfWeek 이름이라 메타에 없음 — 요일 한글명만 로컬 상수
export const WEEKDAY_LABEL: Record<DcaWeekday, string> = {
  MONDAY: '월요일',
  TUESDAY: '화요일',
  WEDNESDAY: '수요일',
  THURSDAY: '목요일',
  FRIDAY: '금요일',
}

export function formatDcaSchedule(
  dca: Pick<DcaConfigRequest, 'frequency' | 'dayOfWeek' | 'dayOfMonth'>,
  frequencyLabel: string,
): string {
  if (dca.frequency === 'WEEKLY' && dca.dayOfWeek) return `${frequencyLabel} ${WEEKDAY_LABEL[dca.dayOfWeek]}`
  if (dca.frequency === 'MONTHLY') return `${frequencyLabel} ${dca.dayOfMonth == null ? '말일' : `${dca.dayOfMonth}일`}`
  return frequencyLabel
}

export function formatDcaCondition(c: DcaCondition, indicatorLabel: string, operatorLabel: string): string {
  if (c.indicator === 'SMA') return `${indicatorLabel}(${c.smaPeriod}) ${operatorLabel}`
  if (c.indicator === 'AVG_PRICE') {
    const t = c.threshold ?? 0
    return `${indicatorLabel} ${t > 0 ? '+' : ''}${t}% ${operatorLabel}`
  }
  return `${indicatorLabel} ${c.threshold} ${operatorLabel}`
}
