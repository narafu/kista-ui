export function fmtUsd(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtKrw(n: number): string {
  return n.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
}

export function fmtPercent(n: number, digits = 2): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`
}

export function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR')
}

export function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ko-KR')
}
