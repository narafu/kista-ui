'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Clock, Users, LogOut, Wallet, ArrowLeftRight, ScrollText, AlertTriangle } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin',             label: 'Overview',  icon: LayoutDashboard, exact: true },
  { href: '/admin/pending',     label: '승인 대기', icon: Clock },
  { href: '/admin/users',       label: '사용자',    icon: Users },
  { href: '/admin/accounts',    label: '계좌 현황', icon: Wallet },
  { href: '/admin/trades',      label: '거래 내역', icon: ArrowLeftRight },
  { href: '/admin/audit',       label: '감사 로그', icon: ScrollText },
  { href: '/admin/anomalies',   label: '이상 징후', icon: AlertTriangle },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <aside className="hidden lg:flex flex-col w-[220px] min-h-screen shrink-0 border-r border-border px-4 py-6 bg-muted/30">
      {/* 로고 */}
      <Link href="/admin" className="flex items-center gap-2 px-2 pb-6">
        <span className="font-extrabold text-lg tracking-wide text-rose-600">KISTA</span>
        <span className="text-xs font-semibold bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded">ADMIN</span>
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

      {/* 로그아웃 */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full text-left"
      >
        <LogOut className="size-[18px] shrink-0" />
        로그아웃
      </button>
    </aside>
  )
}
