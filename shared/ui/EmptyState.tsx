import type { ReactNode } from 'react'
import { cn } from '@shared/lib/utils'

interface Props {
  message: string
  /**
   * 'box' (기본): 테두리 박스형 — admin 테이블 빈 상태에 사용
   * 'text': 텍스트만 — Card 내부 빈 상태에 사용
   */
  variant?: 'box' | 'text'
  /** icon·title·action 중 하나라도 지정하면 rich형(아이콘+제목+설명+CTA) 레이아웃 */
  icon?: ReactNode
  title?: string
  action?: ReactNode
  className?: string
  children?: ReactNode
}

/** 빈 상태 공용 컴포넌트. 문구 마침표를 포함해서 전달한다. */
export function EmptyState({ message, variant = 'box', icon, title, action, className, children }: Props) {
  if (icon || title || action) {
    return (
      <div className={cn('flex flex-col items-center gap-5 py-16 text-center', className)}>
        {icon && <div className="rounded-full bg-muted p-4">{icon}</div>}
        <div className="flex flex-col gap-1.5">
          {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        {action}
        {children}
      </div>
    )
  }

  if (variant === 'text') {
    return (
      <p className={cn('text-sm text-muted-foreground text-center py-8 px-6 whitespace-pre-line', className)}>
        {message}
        {children}
      </p>
    )
  }

  return (
    <div className={cn('rounded-[var(--r-lg)] border border-border p-10 text-center text-sm text-muted-foreground', className)}>
      {children}
      {message}
    </div>
  )
}
