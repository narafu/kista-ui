'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CreditCard, ListChecks, TrendingUp, Wallet, Settings } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { reportClientError } from '@entities/error-log'
import { isNavItemActive } from './nav-utils'

// ponytail: iOS PWA에서 하단 네비가 뷰포트 밖으로 밀리는 현상 원인 확정 전 임시 진단 로그.
// viewport 불일치 값 확보되면(app_error_logs의 MOBILE_NAV_VIEWPORT_MISMATCH) 이 블록 통째로 제거한다.
function useNavViewportDiagnostics(navRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const lastLoggedAt = { current: 0 }
    let logCount = 0
    let rafId = 0
    const check = () => {
      rafId = 0
      const nav = navRef.current
      const vv = window.visualViewport
      if (!nav || !vv || logCount >= 5) return
      const navBottom = nav.getBoundingClientRect().bottom
      const mismatch = Math.abs(navBottom - vv.height - vv.offsetTop)
      const now = Date.now()
      if (mismatch <= 5 || now - lastLoggedAt.current < 15000) return
      lastLoggedAt.current = now
      logCount += 1
      reportClientError({
        errorType: 'MOBILE_NAV_VIEWPORT_MISMATCH',
        context: {
          navBottom: String(navBottom),
          innerHeight: String(window.innerHeight),
          vvHeight: String(vv.height),
          vvOffsetTop: String(vv.offsetTop),
          scrollY: String(window.scrollY),
          bodyTransform: getComputedStyle(document.body).transform,
          standalone: String(window.matchMedia('(display-mode: standalone)').matches),
        },
      })
    }
    const scheduleCheck = () => {
      if (rafId) return
      rafId = requestAnimationFrame(check)
    }
    window.visualViewport?.addEventListener('resize', scheduleCheck)
    window.visualViewport?.addEventListener('scroll', scheduleCheck)
    window.addEventListener('scroll', scheduleCheck, { passive: true })
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      window.visualViewport?.removeEventListener('resize', scheduleCheck)
      window.visualViewport?.removeEventListener('scroll', scheduleCheck)
      window.removeEventListener('scroll', scheduleCheck)
    }
  }, [navRef])
}

const TABS = [
  { href: '/dashboard',  label: '대시보드', icon: LayoutDashboard },
  { href: '/accounts',   label: '계좌',     icon: CreditCard },
  { href: '/strategies', label: '전략',     icon: ListChecks },
  { href: '/stats',      label: '통계',     icon: TrendingUp },
  { href: '/finance',    label: '가계부',   icon: Wallet },
  { href: '/settings',   label: '설정',     icon: Settings },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)
  useNavViewportDiagnostics(navRef)
  return (
    <nav
      ref={navRef}
      aria-label="주요 메뉴"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border flex overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] pb-[env(safe-area-inset-bottom)]"
      style={{ background: 'var(--sidebar-bg)' }}
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = isNavItemActive(pathname, href)
        return (
          <Link key={href} href={href} aria-current={active ? 'page' : undefined} className="min-w-16 flex-1 flex flex-col items-center gap-1 py-2.5 relative">
            {active && (
              <span className="absolute top-1.5 left-1/2 -translate-x-1/2 size-1.5 rounded-full bg-sidebar-active-fg" />
            )}
            <Icon className={cn('size-5', active ? 'text-sidebar-active-fg' : 'text-muted-foreground')} />
            <span className={cn('text-xs font-medium', active ? 'text-sidebar-active-fg' : 'text-muted-foreground')}>
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
