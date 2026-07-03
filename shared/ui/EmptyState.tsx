import type { ReactNode } from 'react'
import { cn } from '@shared/lib/utils'

interface Props {
  message: string
  /**
   * 'box' (기본): 테두리 박스형 — admin 테이블 빈 상태에 사용
   * 'text': 텍스트만 — Card 내부 빈 상태에 사용
   */
  variant?: 'box' | 'text'
  className?: string
  children?: ReactNode
}

/** 빈 상태 공용 컴포넌트. 문구 마침표를 포함해서 전달한다. */
export function EmptyState({ message, variant = 'box', className, children }: Props) {
  if (variant === 'text') {
    return (
      <p className={cn('text-sm text-muted-foreground text-center py-8 px-6', className)}>
        {message}
        {children}
      </p>
    )
  }

  return (
    <div className={cn('rounded-[var(--r-lg)] border border-border p-10 text-center text-sm text-muted-foreground', className)}>
      {message}
      {children}
    </div>
  )
}
