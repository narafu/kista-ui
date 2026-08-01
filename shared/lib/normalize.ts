import { toNum } from './utils'

// API 응답(unknown) → 도메인 타입 정규화 경량 헬퍼. zod 대체 아님 — 반복되던 String()/Number()/toNum() 캐스팅만 추출한다.

export function str(v: unknown): string {
  return String(v)
}

export function optStr(v: unknown): string | undefined {
  return v != null ? String(v) : undefined
}

export function num(v: unknown): number {
  return Number(v)
}

export function optNum(v: unknown): number | undefined {
  return v != null ? Number(v) : undefined
}

// BigDecimal 문자열 → number. 파싱 불가 시 0 (toNum 위임)
export function dec(v: unknown): number {
  return toNum(v)
}

export function optDec(v: unknown): number | undefined {
  return v != null ? toNum(v) : undefined
}
