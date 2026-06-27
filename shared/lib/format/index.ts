export function fmtUsd(n: number, digits = 2): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ko-KR')
}
