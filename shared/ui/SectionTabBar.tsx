'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn, isSectionTabActive } from '@shared/lib/utils'

interface TabOption {
  href: string
  label: string
}

interface Props {
  items: TabOption[]
  rootHref: string
  ariaLabel: string
  className?: string
}

export function SectionTabBar({ items, rootHref, ariaLabel, className }: Props) {
  const pathname = usePathname()

  return (
    <div role="group" aria-label={ariaLabel} className={cn('grid w-full rounded-md border border-border p-0.5 mb-6', className)}>
      {items.map(({ href, label }) => {
        const active = isSectionTabActive(pathname, href, rootHref)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-9 w-full items-center justify-center rounded px-2 py-1 text-center text-sm font-medium transition-colors',
              active
                ? 'bg-[var(--brand-fg-soft)] text-[var(--background)]'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
