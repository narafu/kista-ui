'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@shared/lib/utils'
import { PageHeader } from '@widgets/page-header'
import { isStatsTabActive } from '@widgets/layout/nav-utils'

const TAB_OPTIONS = [
  { href: '/stats', label: '성과' },
  { href: '/stats/benchmark', label: '벤치마크' },
  { href: '/stats/backtest', label: '백테스트' },
]

export function StatsHeader() {
  const pathname = usePathname()
  const activeLabel = TAB_OPTIONS.find(({ href }) => isStatsTabActive(pathname, href))?.label ?? '성과'

  return (
    <>
      <PageHeader eyebrow="Stats" title={activeLabel} />
      <div role="group" aria-label="통계 탭" className="grid w-full grid-cols-3 rounded-md border border-border p-0.5 sm:w-[22rem] mb-6">
        {TAB_OPTIONS.map(({ href, label }) => {
          const active = isStatsTabActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
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
    </>
  )
}
