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
