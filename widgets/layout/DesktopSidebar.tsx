'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { LayoutDashboard, CreditCard, ListChecks, Settings, LogOut, ShieldCheck } from 'lucide-react'
import { ThemeToggle } from '@widgets/theme-toggle'
import { LogoutButton } from '@features/auth/logout'
import { isNavItemActive } from './nav-utils'

const NAV_ITEMS = [
  { href: '/dashboard',  label: '대시보드', icon: LayoutDashboard },
  { href: '/accounts',   label: '계좌 관리', icon: CreditCard },
  { href: '/strategies', label: '전략',     icon: ListChecks },
  { href: '/settings',   label: '설정',     icon: Settings },
]

interface Props {
  isAdmin?: boolean
  isAuthenticated?: boolean
}

export function DesktopSidebar({ isAdmin, isAuthenticated }: Props) {
  const pathname = usePathname()

  return (
    <aside
      className="hidden lg:flex flex-col w-[232px] min-h-screen shrink-0 border-r border-border px-4 py-6"
      style={{ background: 'var(--sidebar-bg)' }}
    >
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2.5 pb-6">
        <Image
          src="/logo.png"
          alt="KISTA"
          width={32}
          height={32}
          className="rounded-[7px] shadow-[0_2px_8px_rgba(143,68,48,.22)]"
          style={{ height: 32, width: 32 }}
        />
        <span className="font-[800] text-xl tracking-[1.2px] text-brand-fg">KISTA</span>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-md)] text-sm font-medium transition-colors ${
                active
                  ? 'bg-rose-50 text-rose-600'
                  : 'text-muted-foreground hover:bg-rose-50/60 hover:text-foreground'
              }`}
            >
              <Icon className="size-[18px] shrink-0" />
              {label}
            </Link>
          )
        })}
        {isAdmin && (
          <>
            <hr className="my-1 border-border" />
            <Link
              href="/admin"
              aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-md)] text-sm font-medium transition-colors ${
                pathname.startsWith('/admin')
                  ? 'bg-violet-50 text-violet-600'
                  : 'text-violet-600 hover:bg-violet-50/60'
              }`}
            >
              <ShieldCheck className="size-[18px] shrink-0" />
              관리자
              <span className="ml-auto text-xs font-bold bg-violet-600 text-white rounded-full px-1.5 py-0.5 leading-none">
                ADMIN
              </span>
            </Link>
          </>
        )}
      </nav>

      {/* Footer: ThemeToggle + Logout */}
      <div className="flex flex-col gap-1 pt-4 border-t border-border">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm text-muted-foreground">테마</span>
          <ThemeToggle />
        </div>
        {isAuthenticated && (
          <LogoutButton className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-md)] text-sm font-medium text-muted-foreground hover:bg-rose-50/60 hover:text-foreground transition-colors w-full text-left">
            <LogOut className="size-[18px] shrink-0" />
            로그아웃
          </LogoutButton>
        )}
      </div>
    </aside>
  )
}
