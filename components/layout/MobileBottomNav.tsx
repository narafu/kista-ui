'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CreditCard, BarChart2, Settings, User } from 'lucide-react'

const TAB_ITEMS = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/accounts', label: '계좌', icon: CreditCard },
  { href: '/statistics', label: '통계', icon: BarChart2 },
  { href: '/settings', label: '설정', icon: Settings },
  { href: '/profile', label: '프로필', icon: User },
] as const

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 64,
      paddingBottom: 8,
      background: 'var(--card)',
      borderTop: '1px solid var(--border)',
      zIndex: 50,
    }} className="flex lg:hidden">
      {TAB_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              textDecoration: 'none',
              color: isActive ? 'var(--rose-500)' : 'var(--muted-foreground)',
              fontSize: 10.5,
              fontWeight: isActive ? 700 : 600,
              transition: 'color .15s',
            }}
          >
            <Icon size={19} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
