import type { HTMLAttributes } from 'react'
import { cn } from '@shared/lib/utils'

/** 구역 제목은 이것 하나다 — 페이지 h1(`PageHeader`) 아래의 h2. className에는 배치(flex·gap·여백)만 넣는다. */
export function SectionTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 className={cn('text-base font-medium leading-snug lg:text-lg', className)} {...props}>
      {children}
    </h2>
  )
}
