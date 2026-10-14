import type { DcaCondition, DcaConfigRequest, DcaWeekday } from './types'

// java DayOfWeek 이름이라 메타에 없음 — 요일 한글명만 로컬 상수
export const WEEKDAY_LABEL: Record<DcaWeekday, string> = {
  MONDAY: '월요일',
  TUESDAY: '화요일',
  WEDNESDAY: '수요일',
  THURSDAY: '목요일',
  FRIDAY: '금요일',
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
  dca: Pick<DcaConfigRequest, 'frequency' | 'dayOfWeek' | 'dayOfMonth'>,
  frequencyLabel: string,
): string {
  if (dca.frequency === 'WEEKLY' && dca.dayOfWeek) return `${frequencyLabel} ${WEEKDAY_LABEL[dca.dayOfWeek]}`
  if (dca.frequency === 'MONTHLY') return `${frequencyLabel} ${dca.dayOfMonth == null ? '말일' : `${dca.dayOfMonth}일`}`
  return frequencyLabel
}

// 서버 검증상 SMA는 smaPeriod, 그 외는 threshold가 필수지만 응답 누락 시 'undefined' 노출 방지로 '-' 표기
export function formatDcaCondition(c: DcaCondition, indicatorLabel: string, operatorLabel: string): string {
  if (c.indicator === 'SMA') return `${indicatorLabel}(${c.smaPeriod ?? '-'}) ${operatorLabel}`
  if (c.threshold == null) return `${indicatorLabel} - ${operatorLabel}`
  if (c.indicator === 'AVG_PRICE') return `${indicatorLabel} ${c.threshold > 0 ? '+' : ''}${c.threshold}% ${operatorLabel}`
  return `${indicatorLabel} ${c.threshold} ${operatorLabel}`
}
