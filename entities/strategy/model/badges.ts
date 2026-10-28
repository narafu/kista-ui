const CYCLE_SEED_BADGE_CLS: Record<string, string> = {
  NONE:     'bg-muted text-foreground',
  MAX:      'bg-info-bg text-info',
  MAINTAIN: 'bg-status-ok-bg text-status-ok',
}

export function seedBadgeClass(cycleSeedType: string): string {
  return CYCLE_SEED_BADGE_CLS[cycleSeedType] ?? 'bg-muted text-foreground'
}

/**
 * 전략 상태에 따른 CSS 색 토큰 값을 반환한다. (인라인 style용)
 * ACTIVE(정상)는 강조하지 않아 undefined, 그 외(PAUSED 등)는 --muted-foreground (회색).
 * 주문 상태 테두리(초록·주황·빨강)와 색 의미가 겹치지 않도록 상태색에는 상태 계열 색을 쓰지 않는다
 */
export function strategyStatusAccent(status: string): string | undefined {
  return status === 'ACTIVE' ? undefined : 'var(--muted-foreground)'
}

/** 전략 타입 축약 표기 — 배지용 (PRIVACY→P, INFINITE→I, 그 외 원문) */
export function strategyTypeShort(type: string): string {
  if (type === 'PRIVACY') return 'P'
  if (type === 'INFINITE') return 'I'
  return type
}
