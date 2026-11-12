import { CURRENCY_SCALE, type Currency } from '@shared/lib/api-schema'

export function fmtUsd(n: number, digits = 2): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** 부호 포함 금액 — 양수는 +, 음수는 toLocaleString의 - 그대로. symbol을 주면 부호와 숫자 사이에 통화 기호를 삽입한다(예: "+$1,234.50"). */
export function fmtSignedUsd(n: number, digits = 2, symbol = ''): string {
  return n >= 0 ? `+${symbol}${fmtUsd(n, digits)}` : `-${symbol}${fmtUsd(Math.abs(n), digits)}`
}

const compactUsdFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 })
const narrowCompactUsdFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumSignificantDigits: 2 })

/** 달러 축약 표기, 소수 최대 1자리(예: "$7.6B", "$12.3B") */
export function fmtCompactUsd(n: number): string {
  return compactUsdFormat.format(n)
}

/** 달러 축약 표기, 유효숫자 2자리로 더 짧게(예: "$12B", "$120K") */
export function fmtCompactUsdNarrow(n: number): string {
  return narrowCompactUsdFormat.format(n)
}

const narrowCompactKrwFormat = new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumSignificantDigits: 2 })
const narrowCompactNumberFormat = new Intl.NumberFormat('en-US', { notation: 'compact', maximumSignificantDigits: 2 })

/** 계좌 통화 축약 표기, 유효숫자 2자리(예: "$12K", "12만원", "1.2K₮"; 좁은 칸용 — USDT는 테더 기호 ₮로 줄인다) */
export function fmtCompactMoneyNarrow(n: number, currency: Currency): string {
  if (currency === 'KRW') return `${narrowCompactKrwFormat.format(n)}원`
  return currency === 'USDT' ? `${narrowCompactNumberFormat.format(n)}₮` : fmtCompactUsdNarrow(n)
}

/** 0~1 비율을 부호 포함 %로. null/undefined는 '-' */
export function fmtSignedPercent(ratio: number | null | undefined, digits = 1): string {
  if (ratio == null) return '-'
  const percent = Math.abs(ratio * 100).toFixed(digits)
  return `${ratio >= 0 ? '+' : '-'}${percent}%`
}

/** 0~1 비율을 부호 포함 %p로. null/undefined는 '-' */
export function fmtSignedPercentPoint(ratio: number | null | undefined, digits = 1): string {
  if (ratio == null) return '-'
  const percent = Math.abs(ratio * 100).toFixed(digits)
  return `${ratio >= 0 ? '+' : '-'}${percent}%p`
}

export function fmtDate(dateStr: string): string {
  // 'yyyy-MM-dd'는 UTC 자정으로 파싱되므로 UTC로 포맷해야 뷰어 시간대(UTC 서쪽)에서 하루 밀리지 않는다
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
  const date = new Date(dateStr)
  // formatToParts는 잘못된 날짜에 throw한다 — 렌더가 깨지지 않게 이전(toLocaleDateString)과 같은 값을 돌려준다
  if (Number.isNaN(date.getTime())) return 'Invalid Date'
  // ko-KR 기본 패턴은 CLDR 버전마다 다르다(CLDR 49부터 '2026/8/1') — 숫자만 받아 'YYYY. M. D.'로 직접 조립한다
  const parts = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric', ...(dateOnly && { timeZone: 'UTC' }) })
    .formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value
  return `${part('year')}. ${part('month')}. ${part('day')}.`
}

/** 날짜+시각 (ko-KR 로케일) */
export function fmtDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ko-KR')
}

/** M월 D일 축약형 — 차트 축 등 */
export function fmtMonthDay(dateStr: string): string {
  // 'yyyy-MM-dd'는 UTC 자정으로 파싱되므로 fmtDate와 같이 UTC로 포맷한다
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', ...(dateOnly && { timeZone: 'UTC' }) })
}

/** 'YYYY-MM' → "2026년 8월" — 문장 속 대상월 표기용(차트 축 축약형은 fmtShortYearMonth) */
export function fmtYearMonthKo(month: string): string {
  const [year, monthPart] = month.split('-')
  return `${year}년 ${Number(monthPart)}월`
}

/**
 * 'YYYY-MM' → "26.3월" — 월별 차트 축·툴팁용. 기록이 뜸하면 연도를 건너뛸 수 있어
 * (예: 2025-03, 2026-03) 연도 없이 "3월"만 쓰면 두 달이 같은 눈금으로 보인다.
 */
export function fmtShortYearMonth(month: string): string {
  const [year, monthPart] = month.split('-')
  const parsedMonth = Number(monthPart)
  if (!year || Number.isNaN(parsedMonth)) return month
  return `${year.slice(2)}.${parsedMonth}월`
}

/**
 * 차트 Y축 원화 눈금 — fmtKrw("1,000,000원")는 좁은 축 폭(44px)에 맞지 않아 만원 단위로 줄인다.
 * 1억 이상은 "60,000만"처럼 길어져 앞자리가 잘리므로 억 단위로 줄인다. 정확한 금액은 툴팁의 fmtKrw로 보여준다.
 */
export function fmtKrwAxisTick(value: number): string {
  if (Math.abs(value) >= 100_000_000) {
    return `${(value / 100_000_000).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}억`
  }
  return `${Math.round(value / 10_000).toLocaleString('ko-KR')}만`
}

/** 시각만 (24시간제) */
export function fmtTime(dateStr: string | Date): string {
  return new Date(dateStr).toLocaleTimeString('ko-KR', { hour12: false })
}

/** 만원 단위 입력값을 억원 단위 문자열로 변환 (예: 344468.13 → "34.4억") */
export function fmtKrwEok(manwon: number, digits = 1): string {
  return `${(manwon / 10000).toFixed(digits)}억`
}

const krwNumberFormat = new Intl.NumberFormat('ko-KR')

/** 원화 정수 금액 포맷 (예: 1000000 → "1,000,000원") */
export function fmtKrw(n: number): string {
  return `${krwNumberFormat.format(n)}원`
}

/** 부호 포함 원화 금액 — 양수는 +, 음수는 - */
export function fmtSignedKrw(n: number): string {
  return n >= 0 ? `+${fmtKrw(n)}` : `-${fmtKrw(Math.abs(n))}`
}

/** 계좌 통화 금액 — USD는 "$1,234.50", KRW는 "1,234원", USDT는 "1,234.50 USDT" */
export function fmtMoney(n: number, currency: Currency): string {
  // 서버가 KRW 합계를 소수 2자리로 줄 수 있다 — 원 단위로 반올림한다(-0은 0으로)
  if (currency === 'KRW') return fmtKrw(Math.round(n) || 0)
  return currency === 'USDT' ? `${fmtUsd(n)} USDT` : `$${fmtUsd(n)}`
}

/** 금액 문자열과 라벨 줄에 따로 둘 단위로 가른다 — 코드형 단위(USDT)만 unit으로 빼고, 기호형 단위($·원)는 text에 그대로 둔다. 값이 없으면 text는 '-'이고 단위는 그대로 붙어 로딩 전후 라벨 줄이 흔들리지 않는다 */
export function splitMoneyUnit(n: number | null | undefined, currency: Currency): { text: string; unit?: string } {
  const unit = currency === 'USDT' ? 'USDT' : undefined
  if (n == null) return { text: '-', unit }
  return unit ? { text: fmtUsd(n), unit } : { text: fmtMoney(n, currency) }
}

/** 입력 칸 뒤에 붙이는 통화 단위 — KRW는 "원", 그 외는 통화 코드(USD·USDT) */
export function currencyUnit(currency: Currency): string {
  return currency === 'KRW' ? '원' : currency
}

/** 부호 포함 계좌 통화 금액 — 예: "+$1.50", "-1,000원", "+1.50 USDT" */
export function fmtSignedMoney(n: number, currency: Currency): string {
  const r = roundMoney(n, currency) // 반올림 뒤 0이 되는 음수를 "-0원"으로 쓰지 않는다
  return `${r >= 0 ? '+' : '-'}${fmtMoney(Math.abs(r), currency)}`
}

/** 계좌 통화 표시 단위로 반올림 — 코인 소수 수량 × 가격의 단위 미만을 버린다 */
export function roundMoney(n: number, currency: Currency): number {
  const f = 10 ** CURRENCY_SCALE[currency]
  return Math.round(n * f) / f
}

/** 수량 — 주식은 정수 그대로, 코인은 최대 8자리 소수에서 끝의 0을 지운다 */
export function fmtQuantity(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(8).replace(/\.?0+$/, '')
}

/** 금액 표시 문자열의 숫자만 ●로 가린다 (예: "1,234,567원" → "●,●●●,●●●원") — 금액 감추기 설정용 */
export function maskAmount(display: string): string {
  return display.replace(/\d/g, '●')
}

/** 금액 입력 필드의 raw value에서 숫자만 남긴다 (AssetForm/TransactionFormDialog/BudgetForm 공용) */
export function digitsOnly(value: string): string {
  return value.replace(/[^0-9]/g, '')
}

/** digitsOnly 결과를 표시용 천단위 콤마 문자열로 변환 */
export function formatAmountDisplay(digits: string): string {
  return digits ? Number(digits).toLocaleString('ko-KR') : ''
}

/** 임의 시각을 KST 기준 'YYYY-MM-DD'로 — 문자열이면 Date로 파싱 후 적용 */
export function toKstDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

export function todayKst(): string {
  return toKstDateString(new Date())
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
