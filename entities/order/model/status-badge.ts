/**
 * 주문 상태 배지 클래스를 반환한다.
 * 시맨틱 토큰 기반 — 라이트/다크는 토큰(`--info`·`--status-ok`·`--warn`)이 자동 전환한다.
 */
export function orderStatusBadgeClass(status: string): string {
  switch (status) {
    case 'PLACED':           return 'bg-info-bg text-info'
    case 'FILLED':           return 'bg-status-ok-bg text-status-ok'
    case 'PARTIALLY_FILLED': return 'bg-warn-bg text-warn'
    case 'FAILED':           return 'bg-status-error-bg text-status-error'
    case 'CANCELLED':        return 'bg-muted text-muted-foreground'
    case 'PLANNED':          return 'bg-muted text-muted-foreground'
    default:                 return 'bg-muted text-muted-foreground'
  }
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

/**
 * 주문 유형 배지 클래스를 반환한다.
 * 시맨틱 토큰 기반 — 라이트/다크는 토큰(`--info`·`--warn`)이 자동 전환한다.
 */
export function orderTypeBadgeClass(orderType: string): string {
  switch (orderType) {
    case 'LIMIT': return 'bg-muted text-muted-foreground'
    case 'LOC':   return 'bg-info-bg text-info'
    case 'MOC':   return 'bg-warn-bg text-warn'
    default:      return 'bg-muted text-muted-foreground'
  }
}
