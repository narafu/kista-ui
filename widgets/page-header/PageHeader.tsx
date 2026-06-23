import Link from 'next/link'
import { cn } from '@shared/lib/utils'
import type { ReactNode } from 'react'

interface Props {
  eyebrow?: string
  eyebrowHref?: string
  title: string
  titleSuffix?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({ eyebrow, eyebrowHref, title, titleSuffix, actions, className }: Props) {
  return (
    <div className={cn('flex items-end justify-between gap-4 mb-8', className)}>
      <div>
        {eyebrow && (
          eyebrowHref ? (
            <Link
              href={eyebrowHref}
              className="text-[11.5px] font-semibold tracking-[0.12em] uppercase text-[var(--brand-fg-soft)] mb-1 hover:text-foreground transition-colors flex items-center gap-1"
            >
              ← {eyebrow}
            </Link>
          ) : (
            <p className="text-[11.5px] font-semibold tracking-[0.12em] uppercase text-[var(--brand-fg-soft)] mb-1">
              {eyebrow}
            </p>
          )
        )}
        <div className="flex items-baseline gap-3">
          <h1 className="text-[26px] font-[800] leading-tight text-foreground">{title}</h1>
          {titleSuffix}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
