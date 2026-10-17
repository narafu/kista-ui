import type { DcaCondition, DcaConfigRequest, DcaWeekday } from './types'

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

// DCA 실행 결과 상태는 메타에 없음 — 카드·실행 이력이 같은 라벨을 쓰도록 로컬 상수 하나로 둔다
const DCA_EXECUTION_STATUS_LABEL: Record<string, string> = {
  ORDERED: '주문됨',
  SKIPPED: '건너뜀',
}

export function dcaExecutionStatusLabel(status: string): string {
  return DCA_EXECUTION_STATUS_LABEL[status] ?? status
}

export function formatDcaSchedule(
  dca: Pick<DcaConfigRequest, 'frequency' | 'dayOfWeek' | 'dayOfMonth'> & { executionHour?: number | null },
  frequencyLabel: string,
): string {
  const day = dca.frequency === 'WEEKLY' && dca.dayOfWeek
    ? `${frequencyLabel} ${WEEKDAY_LABEL[dca.dayOfWeek]}`
    : dca.frequency === 'MONTHLY'
      ? `${frequencyLabel} ${dca.dayOfMonth == null ? '말일' : `${dca.dayOfMonth}일`}`
      : frequencyLabel
  return dca.executionHour == null ? day : `${day} ${formatExecutionHour(dca.executionHour)}`
}

// 서버 검증상 SMA는 smaPeriod, 그 외는 threshold가 필수지만 응답 누락 시 'undefined' 노출 방지로 '-' 표기
export function formatDcaCondition(c: DcaCondition, indicatorLabel: string, operatorLabel: string): string {
  if (c.indicator === 'SMA') return `${indicatorLabel}(${c.smaPeriod ?? '-'}) ${operatorLabel}`
  if (c.threshold == null) return `${indicatorLabel} - ${operatorLabel}`
  if (c.indicator === 'AVG_PRICE') return `${indicatorLabel} ${c.threshold > 0 ? '+' : ''}${c.threshold}% ${operatorLabel}`
  return `${indicatorLabel} ${c.threshold} ${operatorLabel}`
}
