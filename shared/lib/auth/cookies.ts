export const KISTA_TOKEN_COOKIE = 'kista-token'
export const STATUS_COOKIE = 'kista-user-status'
export const ROLE_COOKIE = 'kista-user-role'
export const RT_COOKIE = 'refresh_token'
// 활성 finance 그룹 포인터 — 비민감 UUID라 httpOnly 아님, 클라이언트에서 document.cookie로 직접 갱신
export const ACTIVE_GROUP_COOKIE = 'kista-active-group'
export const CLEAR_COOKIE = { maxAge: 0, path: '/' } as const
