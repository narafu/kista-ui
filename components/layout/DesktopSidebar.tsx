'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { LayoutDashboard, CreditCard, BarChart2, Settings, LogOut } from 'lucide-react'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { useTheme } from 'next-themes'

const NAV_ITEMS = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/accounts', label: '계좌 관리', icon: CreditCard },
  { href: '/statistics', label: '통계', icon: BarChart2 },
  { href: '/settings', label: '설정', icon: Settings },
]

export function DesktopSidebar() {
  const pathname = usePathname()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  return (
    <aside
      className="hidden lg:flex flex-col w-[232px] min-h-screen shrink-0"
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        padding: '24px 16px',
      }}
    >
      {/* Logo */}
      <Link href="/dashboard" style={{ padding: '4px 10px 22px', display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <Image
          src="/logo.png"
          alt="KISTA"
          width={32}
          height={32}
          style={{ borderRadius: 7, boxShadow: '0 2px 8px rgba(143,68,48,.22)' }}
        />
        <span style={{
          fontWeight: 800,
          letterSpacing: 1.2,
          fontSize: 20,
          color: 'var(--brand-fg)',
          fontFamily: 'var(--font-sans)',
        }}>
          KISTA
        </span>
      </Link>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: isActive ? '10px 12px 10px 9px' : '10px 12px',
                borderRadius: 8,
                fontSize: 13.5,
                fontWeight: isActive ? 700 : 600,
                color: isActive ? 'var(--sidebar-active-fg)' : 'var(--sidebar-fg)',
                background: isActive ? 'var(--sidebar-active-bg)' : 'transparent',
                boxShadow: isActive ? 'var(--sh-card)' : 'none',
                textDecoration: 'none',
                borderLeft: isActive ? '3px solid var(--rose-500)' : '3px solid transparent',
                transition: 'background .15s, color .15s',
              }}
            >
              <span style={{ color: isActive ? 'var(--rose-500)' : 'var(--muted-foreground)' }}>
                <Icon size={17} />
              </span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: user card + theme toggle + logout */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* User card */}
        <div style={{
          padding: 14,
          borderRadius: 12,
          background: 'var(--card)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: '#FEE500',
              color: '#3C1E1E',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: 12,
              flexShrink: 0,
            }}>K</span>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--foreground)' }}>내 계정</div>
          </div>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            height: 22,
            padding: '0 8px',
            borderRadius: 999,
            fontSize: 11.5,
            fontWeight: 600,
            background: 'var(--status-ok-bg)',
            color: 'var(--status-ok)',
          }}>● ACTIVE</span>
        </div>

        {/* Theme toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderRadius: 10,
        }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--sidebar-fg)' }}>테마</span>
          <ThemeToggle size="sm" />
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 12px',
            height: 38,
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--muted-foreground)',
            fontSize: 13.5,
            fontWeight: 600,
            width: '100%',
          }}
        >
          <LogOut size={15} />
          로그아웃
        </button>
      </div>
    </aside>
  )
}
