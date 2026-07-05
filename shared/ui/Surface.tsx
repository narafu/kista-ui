import type { HTMLAttributes } from 'react'
import { cn } from '@shared/lib/utils'

type Props = HTMLAttributes<HTMLElement> & { as?: 'div' | 'section' }

/** 표준 카드 셸 — r-lg 라운드 + bg-card + border + sh-card 그림자. 패딩·레이아웃은 className으로 지정한다. */
export function Surface({ as: Tag = 'div', className, ...props }: Props) {
  return (
    <Tag
      className={cn('rounded-[var(--r-lg)] bg-card border border-border shadow-[var(--sh-card)]', className)}
      {...props}
    />
  )
}
