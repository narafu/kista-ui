const ORDER_STATUS_BADGE_CLS: Record<string, string> = {
  PLACED:           'bg-info-bg text-info',
  FILLED:           'bg-status-ok-bg text-status-ok',
  PARTIALLY_FILLED: 'bg-warn-bg text-warn',
  FAILED:           'bg-status-error-bg text-status-error',
}

/**
 * 주문 상태 배지 클래스를 반환한다.
 * 시맨틱 토큰 기반 — 라이트/다크는 토큰(`--info`·`--status-ok`·`--warn`)이 자동 전환한다.
 */
export function orderStatusBadgeClass(status: string): string {
  return ORDER_STATUS_BADGE_CLS[status] ?? 'bg-muted text-muted-foreground'
}

/** 주문 상태 한국어 라벨 */
export const ORDER_STATUS_LABEL: Record<string, string> = {
  PLACED:           '접수',
  FILLED:           '체결',
  PARTIALLY_FILLED: '부분체결',
  FAILED:           '실패',
  CANCELLED:        '취소',
  PLANNED:          '예정',
}

const ORDER_TYPE_BADGE_CLS: Record<string, string> = {
  LOC: 'bg-info-bg text-info',
  MOC: 'bg-warn-bg text-warn',
}

/**
 * 주문 유형 배지 클래스를 반환한다.
 * 시맨틱 토큰 기반 — 라이트/다크는 토큰(`--info`·`--warn`)이 자동 전환한다.
 */
export function orderTypeBadgeClass(orderType: string): string {
  return ORDER_TYPE_BADGE_CLS[orderType] ?? 'bg-muted text-muted-foreground'
}
