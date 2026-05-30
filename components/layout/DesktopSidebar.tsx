'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { LayoutDashboard, CreditCard, BarChart2, Settings, LogOut } from 'lucide-react'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { clientFetch } from '@/lib/api/client'

const NAV_ITEMS = [
  { href: '/dashboard',  label: '대시보드', icon: LayoutDashboard },
  { href: '/accounts',   label: '계좌 관리', icon: CreditCard },
  { href: '/statistics', label: '통계',     icon: BarChart2 },
  { href: '/settings',   label: '설정',     icon: Settings },
]

export function DesktopSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await clientFetch<void>('/api/auth/logout', { method: 'POST' }).catch(() => {})
    router.push('/')
  }

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
          className="rounded-[7px]"
          style={{ boxShadow: '0 2px 8px rgba(143,68,48,.22)', height: 32, width: 32 }}
        />
        <span className="font-[800] text-xl tracking-[1.2px] text-brand-fg">KISTA</span>
      </Link>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
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
      </nav>

      {/* Footer: ThemeToggle + Logout */}
      <div className="flex flex-col gap-1 pt-4 border-t border-border">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs text-muted-foreground">테마</span>
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--r-md)] text-sm font-medium text-muted-foreground hover:bg-rose-50/60 hover:text-foreground transition-colors w-full text-left"
        >
          <LogOut className="size-[18px] shrink-0" />
          로그아웃
        </button>
      </div>
    </aside>
  )
}
