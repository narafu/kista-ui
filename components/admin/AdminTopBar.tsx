'use client'

import { usePathname } from 'next/navigation'
import { LayoutDashboard, Clock, Users, Wallet, ArrowLeftRight, ScrollText, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/admin',             label: 'Overview',  icon: LayoutDashboard, exact: true },
  { href: '/admin/pending',     label: '승인 대기', icon: Clock },
  { href: '/admin/users',       label: '사용자',    icon: Users },
  { href: '/admin/accounts',    label: '계좌',      icon: Wallet },
  { href: '/admin/trades',      label: '거래',      icon: ArrowLeftRight },
  { href: '/admin/audit',       label: '감사',      icon: ScrollText },
  { href: '/admin/anomalies',   label: '이상',      icon: AlertTriangle },
]

export function AdminTopBar() {
  const pathname = usePathname()

  return (
    <header className="lg:hidden sticky top-0 z-10 border-b border-border bg-background">
      {/* 헤더 타이틀 */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="font-extrabold text-base text-rose-600">KISTA</span>
        <span className="text-xs font-semibold bg-rose-100 text-rose-600 px-2 py-0.5 rounded">ADMIN</span>
      </div>
      {/* 탭 네비게이션 */}
      <nav className="flex border-t border-border">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
                active ? 'text-rose-600' : 'text-muted-foreground'
              }`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
