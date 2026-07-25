import { todayKst } from '@shared/lib/format'
import type { Strategy } from './types'

/** startDate가 오늘 이후면 아직 매매 시작 전(시작예정) — ISO yyyy-MM-dd 문자열 비교라 시간대 안전. */
export function isScheduledStart(strategy: Strategy): boolean {
  return strategy.startDate != null && strategy.startDate > todayKst()
}

/**
 * "N월 N일 시작예정" 배지 라벨. `fmtMonthDay`(숫자형 "8. 1.")는 이 문구와 다르므로 재사용하지 않고
 * yyyy-MM-dd 문자열을 직접 파싱한다 — `new Date()` 파싱은 UTC 자정으로 해석돼 UTC보다 느린 시간대에서
 * 날짜가 하루 밀릴 수 있어 피한다.
 */
export function scheduledStartBadgeLabel(startDate: string): string {
  const [, month, day] = startDate.split('-').map(Number)
  return `${month}월 ${day}일 시작예정`
}
