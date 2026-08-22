export function fmtUsd(n: number, digits = 2): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** 부호 포함 금액 — 양수는 +, 음수는 toLocaleString의 - 그대로. symbol을 주면 부호와 숫자 사이에 통화 기호를 삽입한다(예: "+$1,234.50"). */
export function fmtSignedUsd(n: number, digits = 2, symbol = ''): string {
  return n >= 0 ? `+${symbol}${fmtUsd(n, digits)}` : `-${symbol}${fmtUsd(Math.abs(n), digits)}`
}

/** 0~1 비율을 부호 포함 %로. null/undefined는 '—' */
export function fmtSignedPercent(ratio: number | null | undefined, digits = 1): string {
  if (ratio == null) return '—'
  const percent = Math.abs(ratio * 100).toFixed(digits)
  return `${ratio >= 0 ? '+' : '-'}${percent}%`
}

/** 0~1 비율을 부호 포함 %p로. null/undefined는 '—' */
export function fmtSignedPercentPoint(ratio: number | null | undefined, digits = 1): string {
  if (ratio == null) return '—'
  const percent = Math.abs(ratio * 100).toFixed(digits)
  return `${ratio >= 0 ? '+' : '-'}${percent}%p`
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

/** 만원 단위 입력값을 억원 단위 문자열로 변환 (예: 344468.13 → "34.4억") */
export function fmtKrwEok(manwon: number, digits = 1): string {
  return `${(manwon / 10000).toFixed(digits)}억`
}

/** 원화 정수 금액 포맷 (예: 1000000 → "1,000,000원") */
export function fmtKrw(n: number): string {
  return `${new Intl.NumberFormat('ko-KR').format(n)}원`
}

/** 부호 포함 원화 금액 — 양수는 +, 음수는 - */
export function fmtSignedKrw(n: number): string {
  return n >= 0 ? `+${fmtKrw(n)}` : `-${fmtKrw(Math.abs(n))}`
}

/** 금액 표시 문자열의 숫자만 ●로 가린다 (예: "1,234,567원" → "●,●●●,●●●원") — 금액 감추기 설정용 */
export function maskAmount(display: string): string {
  return display.replace(/\d/g, '●')
}

/** 금액 입력 필드의 raw value에서 숫자만 남긴다 (AssetForm/TransactionFormDialog/BudgetFormDialog 공용) */
export function digitsOnly(value: string): string {
  return value.replace(/[^0-9]/g, '')
}

/** digitsOnly 결과를 표시용 천단위 콤마 문자열로 변환 */
export function formatAmountDisplay(digits: string): string {
  return digits ? Number(digits).toLocaleString('ko-KR') : ''
}

export function todayKst(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

/** 0~1 비율을 정수 % 값으로 변환 — 부동소수점 오차 제거(NUMERIC(6,2) 정밀도 기준) */
export function ratioToPercent(ratio: number): number {
  return Math.round(ratio * 10000) / 100
}

/** 정수 % 값을 0~1 비율로 변환 */
export function percentToRatio(percent: number): number {
  return percent / 100
}

export { pnlTextClass } from './pnl'
