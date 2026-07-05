import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@shared/lib/utils'

const badgeVariants = cva(
  'inline-flex shrink-0 items-center rounded-full font-semibold whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-muted text-muted-foreground',
        warn: 'bg-warn-bg text-warn',
        ok: 'bg-status-ok-bg text-status-ok',
        error: 'bg-[var(--status-error-bg)] text-[var(--status-error)]',
        brand: 'bg-rose-50 text-rose-600',
        // 색은 className으로 주입 — entities 배지 클래스(seedBadgeClass 등) 조합용
        none: '',
      },
      size: {
        sm: 'px-2 h-[20px] text-xs',
        md: 'px-2.5 h-[24px] text-xs',
        lg: 'px-3 h-[28px] text-xs lg:text-sm',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'sm' },
  },
)

type Props = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>

/** 상태·유형 표시 공용 배지. 색 변형은 tone, 크기는 size로 지정한다. */
export function Badge({ tone, size, className, ...props }: Props) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
}
