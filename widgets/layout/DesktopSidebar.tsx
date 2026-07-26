'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { LayoutDashboard, CreditCard, ListChecks, TrendingUp, Scale, Settings, LogOut, LogIn, ShieldCheck } from 'lucide-react'
import { ThemeToggle } from '@widgets/theme-toggle'
import { LogoutButton } from '@features/auth/logout'
import { isNavItemActive } from './nav-utils'

const NAV_ITEMS = [
  { href: '/dashboard',  label: '대시보드', icon: LayoutDashboard },
  { href: '/accounts',   label: '계좌',     icon: CreditCard },
  { href: '/strategies', label: '전략',     icon: ListChecks },
  { href: '/stats',      label: '통계',     icon: TrendingUp },
  { href: '/benchmark',  label: '벤치마크', icon: Scale },
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
      className="hidden lg:flex flex-col w-[232px] h-screen sticky top-0 shrink-0 border-r border-border px-4 py-6 overflow-y-auto"
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
                  ? 'bg-sidebar-active text-sidebar-active-fg'
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
                  ? 'bg-admin-bg text-admin-fg'
                  : 'text-admin-fg hover:bg-admin-bg/60'
              }`}
            >
              <ShieldCheck className="size-[18px] shrink-0" />
              관리자
              <span className="ml-auto text-xs font-bold bg-admin-bg text-admin-fg rounded-full px-1.5 py-0.5 leading-none">
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
        {isAuthenticated ? (
          <LogoutButton className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-md)] text-sm font-medium text-muted-foreground hover:bg-rose-50/60 hover:text-foreground transition-colors w-full text-left">
            <LogOut className="size-[18px] shrink-0" />
            로그아웃
          </LogoutButton>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-md)] text-sm font-medium text-muted-foreground hover:bg-rose-50/60 hover:text-foreground transition-colors"
          >
            <LogIn className="size-[18px] shrink-0" />
            로그인
          </Link>
        )}
      </div>
    </aside>
  )
}
