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
  // 탭 href를 그대로 쓰지 않고 가공해야 할 때(예: 가계부 수입/소비/저축의 조회 기간
  // 쿼리스트링 계승) 호출부가 넘긴다. 기본은 항등 함수.
  getHref?: (href: string) => string
}

export function SectionTabBar({ items, rootHref, ariaLabel, className, getHref }: Props) {
  const pathname = usePathname()

  return (
    <div role="group" aria-label={ariaLabel} className={cn('grid w-full rounded-md border border-border p-0.5 mb-6', className)}>
      {items.map(({ href, label }) => {
        const active = isSectionTabActive(pathname, href, rootHref)
        return (
          <Link
            key={href}
            href={getHref ? getHref(href) : href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'min-h-9 w-full rounded px-2 py-1 text-center text-sm font-medium transition-colors',
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
