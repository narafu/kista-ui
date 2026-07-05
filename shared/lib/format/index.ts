export function fmtUsd(n: number, digits = 2): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** 부호 포함 금액 — 양수는 +, 음수는 toLocaleString의 - 그대로 */
export function fmtSignedUsd(n: number, digits = 2): string {
  return n >= 0 ? `+${fmtUsd(n, digits)}` : fmtUsd(n, digits)
}

export function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR')
}

/** 날짜+시각 (ko-KR 로케일) */
export function fmtDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ko-KR')
}

/** M월 D일 축약형 — 차트 축 등 */
export function fmtMonthDay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
}

/** 시각만 (24시간제) */
export function fmtTime(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleTimeString('ko-KR', { hour12: false })
}

export function todayKst(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

export { pnlTextClass } from './pnl'
