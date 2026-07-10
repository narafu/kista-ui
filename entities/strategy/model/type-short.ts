/** 전략 타입 축약 표기 — 배지용 (PRIVACY→P, INFINITE→I, 그 외 원문) */
export function strategyTypeShort(type: string): string {
  if (type === 'PRIVACY') return 'P'
  if (type === 'INFINITE') return 'I'
  return type
}
