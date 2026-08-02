import type { UserStatus } from './types'

/**
 * 사용자 본인 화면(settings)에서 사용하는 상태 라벨.
 * 활성/대기/반려
 */
export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: '활성',
  PENDING: '대기',
  REJECTED: '반려',
}

/**
 * 관리자 화면(admin)에서 사용하는 상태 라벨.
 * 의도적으로 다름: 승인/대기/거절
 */
export const ADMIN_USER_STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: '승인',
  PENDING: '대기',
  REJECTED: '거절',
}

/**
 * 상태별 시맨틱 톤 — Badge 컴포넌트의 tone prop과 함께 사용.
 */
export const USER_STATUS_TONE: Record<UserStatus, 'ok' | 'warn' | 'error'> = {
  ACTIVE: 'ok',
  PENDING: 'warn',
  REJECTED: 'error',
}

/**
 * 상태 톤을 CSS 변수로 변환.
 * 사용자 본인 화면에서 인라인 color 스타일링에 사용.
 */
export function userStatusColorVar(status: UserStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'var(--status-ok)'
    case 'PENDING':
      return 'var(--warn)'
    case 'REJECTED':
      return 'var(--status-error)'
  }
}
