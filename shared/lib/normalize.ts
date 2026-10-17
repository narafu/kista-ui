import { toNum } from './utils'

// API 응답(unknown) → 도메인 타입 정규화 경량 헬퍼. zod 대체 아님 — 반복되던 String()/Number()/toNum() 캐스팅만 추출한다.

export function optStr(v: unknown): string | undefined {
  return v != null ? String(v) : undefined
}

export function optNum(v: unknown): number | undefined {
  return v != null ? Number(v) : undefined
}

export function optDec(v: unknown): number | undefined {
  return v != null ? toNum(v) : undefined
}
