export function fmtUsd(n: number, digits = 2): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR')
}

export function todayKst(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

export { pnlTextClass } from './pnl'
