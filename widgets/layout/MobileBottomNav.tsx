'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CreditCard, ListChecks, BarChart2, Settings } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { isNavItemActive } from './nav-utils'

const TABS = [
  { href: '/dashboard',  label: '대시보드', icon: LayoutDashboard },
  { href: '/accounts',   label: '계좌',     icon: CreditCard },
  { href: '/strategies', label: '전략',     icon: ListChecks },
  { href: '/statistics', label: '통계',     icon: BarChart2 },
  { href: '/settings',   label: '설정',     icon: Settings },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  return (
    <nav
      aria-label="주요 메뉴"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border flex"
      style={{ background: 'var(--sidebar-bg)' }}
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = isNavItemActive(pathname, href)
        return (
          <Link key={href} href={href} aria-current={active ? 'page' : undefined} className="flex-1 flex flex-col items-center gap-1 py-2.5 relative">
            {active && (
              <span className="absolute top-1.5 left-1/2 -translate-x-1/2 size-1.5 rounded-full bg-rose-500" />
            )}
            <Icon className={cn('size-5', active ? 'text-rose-600' : 'text-muted-foreground')} />
            <span className={cn('text-[10px] font-medium', active ? 'text-rose-600' : 'text-muted-foreground')}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
