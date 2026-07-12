/**
 * 주문 상태 배지 클래스를 반환한다.
 * dark shade는 /40·텍스트 -400 계열로 통일 (canonical).
 */
export function orderStatusBadgeClass(status: string): string {
  switch (status) {
    case 'PLACED':           return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
    case 'FILLED':           return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
    case 'PARTIALLY_FILLED': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
    case 'FAILED':           return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
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
 * dark shade는 /40·텍스트 -400 계열로 통일 (canonical).
 */
export function orderTypeBadgeClass(orderType: string): string {
  switch (orderType) {
    case 'LIMIT': return 'bg-muted text-muted-foreground'
    case 'LOC':   return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400'
    case 'MOC':   return 'bg-warn-bg text-warn'
    default:      return 'bg-muted text-muted-foreground'
  }
}
