const CYCLE_SEED_BADGE_CLS: Record<string, string> = {
  NONE:     'bg-muted text-muted-foreground',
  MAX:      'bg-info-bg text-info',
  MAINTAIN: 'bg-status-ok-bg text-status-ok',
}

export function seedBadgeClass(cycleSeedType: string): string {
  return CYCLE_SEED_BADGE_CLS[cycleSeedType] ?? 'bg-muted text-muted-foreground'
}

/**
 * 전략 상태에 따른 CSS 색 토큰 값을 반환한다. (인라인 style용)
 * ACTIVE → --status-ok (초록), PAUSED → --warn (주황)
 */
const STRATEGY_STATUS_ACCENT: Record<string, string> = {
  ACTIVE: 'var(--status-ok)',
  PAUSED: 'var(--warn)',
}

export function strategyStatusAccent(status: string): string {
  return STRATEGY_STATUS_ACCENT[status] ?? 'var(--muted-foreground)'
}

/** 전략 타입 축약 표기 — 배지용 (PRIVACY→P, INFINITE→I, 그 외 원문) */
export function strategyTypeShort(type: string): string {
  if (type === 'PRIVACY') return 'P'
  if (type === 'INFINITE') return 'I'
  return type
}
