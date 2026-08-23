import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@shared/lib/utils'

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  'aria-label': string
  variant?: 'ghost' | 'tinted'
  children: ReactNode
}

const BASE_CLASS = 'relative inline-flex items-center justify-center size-11 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'

const VARIANT_CLASS = {
  ghost: 'text-muted-foreground hover:text-foreground hover:bg-accent',
  tinted: 'bg-accent text-foreground hover:bg-accent/80',
} as const

// <Link>로 아이콘 버튼을 구현해야 하는 경우(widgets.md 규칙상 IconButton은 <button> 전용이라
// 페이지 이동 링크에는 못 쓴다) 이 완성된 클래스 문자열을 그대로 재사용한다 — BASE_CLASS/
// VARIANT_CLASS를 개별 조합해 손으로 다시 이어 붙이면 스타일이 서서히 드리프트한다(실제로
// 한 번 발생해 리뷰에서 발견됨).
export const ICON_LINK_GHOST_CLASS = cn(BASE_CLASS, VARIANT_CLASS.ghost)

/** 44px 히트영역 공용 아이콘 버튼. 시각 크기는 children(아이콘) 기준, 접근성 위해 aria-label 필수. */
export function IconButton({ variant = 'ghost', className, type = 'button', title, children, ...props }: Props) {
  return (
    <button
      type={type}
      // 브라우저 기본 title 툴팁 — 별도 title을 넘기지 않으면 aria-label을 그대로 재사용해
      // 호버 시 버튼 설명(예: "삭제")이 뜬다. 명시적 title이 있으면 그 값을 우선한다.
      title={title ?? props['aria-label']}
      className={cn(BASE_CLASS, VARIANT_CLASS[variant], className)}
      {...props}
    >
      {children}
    </button>
  )
}
