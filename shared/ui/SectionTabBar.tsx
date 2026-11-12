'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn, isSectionTabActive } from '@shared/lib/utils'
import { SEGMENT_ACTIVE_CLASS, SEGMENT_INACTIVE_CLASS, SEGMENT_LIST_CLASS } from './segmentedStyles'

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
    // 라우트 이동 링크라 WAI-ARIA tabs가 아니라 내비게이션 랜드마크 + aria-current
    <nav aria-label={ariaLabel} className={cn('grid w-full mb-6', SEGMENT_LIST_CLASS, className)}>
      {items.map(({ href, label }) => {
        const active = isSectionTabActive(pathname, href, rootHref)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex min-h-9 w-full items-center justify-center rounded px-2 py-1 text-center text-sm font-medium transition-colors',
              active ? SEGMENT_ACTIVE_CLASS : SEGMENT_INACTIVE_CLASS,
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
