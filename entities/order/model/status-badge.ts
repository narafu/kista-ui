import type { OrderStatus } from '@shared/lib/api-schema'

const ORDER_STATUS_BADGE_CLS: Record<string, string> = {
  PLACED:           'bg-info-bg text-info',
  FILLED:           'bg-status-ok-bg text-status-ok',
  PARTIALLY_FILLED: 'bg-warn-bg text-warn',
  SUBMITTING:       'bg-warn-bg text-warn', // 접수 결과 미확정 — 오래 남으면 관리자 정정 대상
  FAILED:           'bg-status-error-bg text-status-error',
} satisfies Partial<Record<OrderStatus, string>>

/**
 * 주문 상태 배지 클래스를 반환한다.
 * 시맨틱 토큰 기반 — 라이트/다크는 토큰(`--info`·`--status-ok`·`--warn`)이 자동 전환한다.
 */
export function orderStatusBadgeClass(status: string): string {
  return ORDER_STATUS_BADGE_CLS[status] ?? 'bg-muted text-foreground'
}

