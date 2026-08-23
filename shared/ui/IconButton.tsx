import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@shared/lib/utils'

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  'aria-label': string
  variant?: 'ghost' | 'tinted'
  children: ReactNode
}

const VARIANT_CLASS = {
  ghost: 'text-muted-foreground hover:text-foreground hover:bg-accent',
  tinted: 'bg-accent text-foreground hover:bg-accent/80',
} as const

/** 44px 히트영역 공용 아이콘 버튼. 시각 크기는 children(아이콘) 기준, 접근성 위해 aria-label 필수. */
export function IconButton({ variant = 'ghost', className, type = 'button', title, children, ...props }: Props) {
  return (
    <button
      type={type}
      // 브라우저 기본 title 툴팁 — 별도 title을 넘기지 않으면 aria-label을 그대로 재사용해
      // 호버 시 버튼 설명(예: "삭제")이 뜬다. 명시적 title이 있으면 그 값을 우선한다.
      title={title ?? props['aria-label']}
      className={cn(
        'relative inline-flex items-center justify-center size-11 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_CLASS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
