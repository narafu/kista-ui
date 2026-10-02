import { cn } from '@shared/lib/utils'

export const BASE_CLASS = 'relative inline-flex items-center justify-center size-11 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

export const VARIANT_CLASS = {
  ghost: 'text-muted-foreground hover:text-foreground hover:bg-accent',
  tinted: 'bg-accent text-foreground hover:bg-accent/80',
} as const

// <Link>로 아이콘 버튼을 구현해야 하는 경우(widgets.md 규칙상 IconButton은 <button> 전용이라
// 페이지 이동 링크에는 못 쓴다) 이 완성된 클래스 문자열을 그대로 재사용한다 — BASE_CLASS/
// VARIANT_CLASS를 개별 조합해 손으로 다시 이어 붙이면 스타일이 서서히 드리프트한다(실제로
// 한 번 발생해 리뷰에서 발견됨).
export const ICON_LINK_GHOST_CLASS = cn(BASE_CLASS, VARIANT_CLASS.ghost)
