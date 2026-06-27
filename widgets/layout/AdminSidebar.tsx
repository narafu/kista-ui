'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, LogOut, Wallet, ArrowLeftRight, ClipboardList, ArrowLeft, Table2 } from 'lucide-react'
import { LogoutButton } from '@features/auth/logout'

const NAV_ITEMS = [
  { href: '/admin',                label: 'Overview',    icon: LayoutDashboard, exact: true },
  { href: '/admin/users',          label: '사용자',      icon: Users },
  { href: '/admin/accounts',       label: '계좌 현황',   icon: Wallet },
  { href: '/admin/trades',         label: '주문내역',    icon: ArrowLeftRight },
  { href: '/admin/privacy-trades', label: '기준 매매표', icon: Table2 },
  { href: '/admin/logs',           label: '운영 로그',   icon: ClipboardList },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-[220px] min-h-screen shrink-0 border-r border-border px-4 py-6 bg-muted/30">
      {/* 로고 */}
      <Link href="/admin" className="flex items-center gap-2 px-2 pb-6">
        <span className="font-extrabold text-lg tracking-wide" style={{ color: 'var(--brand-fg-soft)' }}>KISTA</span>
        <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{ background: 'var(--rose-200)', color: 'var(--brand-fg-soft)' }}>ADMIN</span>
      </Link>

      {/* 네비게이션 */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-rose-50 text-rose-600'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="size-[18px] shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* 앱으로 돌아가기 + 로그아웃 */}
      <Link
        href="/dashboard"
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-[18px] shrink-0" />
        앱으로 돌아가기
      </Link>
      <LogoutButton className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full text-left">
        <LogOut className="size-[18px] shrink-0" />
        로그아웃
      </LogoutButton>
    </aside>
  )
}
