'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CreditCard, ListChecks, TrendingUp, Wallet, Settings } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { reportClientError } from '@entities/error-log'
import { isNavItemActive } from './nav-utils'

const isEditableFocused = () => {
  const el = document.activeElement
  return el instanceof HTMLElement && (el.matches('input:not([type=checkbox], [type=radio], [type=button], [type=submit], [type=range]), textarea, select') || el.isContentEditable)
}

// iOS standalone PWA: 키보드가 닫힌 뒤(또는 하단 러버밴드 중) visualViewport.offsetTop이 0으로 복귀하지 않고 남아
// position:fixed 네비가 navBottom = innerHeight - offsetTop 위치로 떠 있거나 화면 밖으로 밀린다
// (app_error_logs MOBILE_NAV_VIEWPORT_MISMATCH 2026-09-21~28, 키보드 닫힌 행 전부 이 관계식 성립).
// 키보드 닫힘 + 줌 없음일 때만 offsetTop만큼 되돌린다 — 키보드가 열려 있으면 네비가 키보드 뒤에 있는 게 정상이라 보정 안 함.
// 키보드 판정은 포커스된 편집 요소 기준 — innerHeight 자체가 키보드와 함께 줄어드는 경우가 있어 높이 비교는 못 쓴다.
// ponytail: 실기기 검증 불가라 진단 로그를 같이 유지 — 보정 적용 후에도 어긋난 경우만 기록(shift 포함). 로그 잠잠해지면 로그 블록 제거.
function useNavViewportCorrection(navRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const lastLoggedAt = { current: 0 }
    let logCount = 0
    let rafId = 0
    const update = () => {
      rafId = 0
      const nav = navRef.current
      if (!nav) return
      const keyboardOpen = isEditableFocused()
      const shift = !keyboardOpen && Math.abs(vv.scale - 1) < 0.01 ? vv.offsetTop : 0
      nav.style.transform = shift ? `translateY(${shift}px)` : ''

      const rect = nav.getBoundingClientRect()
      if (keyboardOpen || rect.width === 0 || logCount >= 5) return // width 0 = lg:hidden 데스크탑
      const mismatch = Math.abs(rect.bottom - vv.height)
      const now = Date.now()
      if (mismatch <= 5 || now - lastLoggedAt.current < 15000) return
      lastLoggedAt.current = now
      logCount += 1
      reportClientError({
        errorType: 'MOBILE_NAV_VIEWPORT_MISMATCH',
        context: {
          navBottom: String(rect.bottom),
          innerHeight: String(window.innerHeight),
          vvHeight: String(vv.height),
          vvOffsetTop: String(vv.offsetTop),
          vvScale: String(vv.scale),
          appliedShift: String(shift),
          scrollY: String(window.scrollY),
          standalone: String(window.matchMedia('(display-mode: standalone)').matches),
        },
      })
    }
    const schedule = () => {
      if (rafId) return
      rafId = requestAnimationFrame(update)
    }
    vv.addEventListener('resize', schedule)
    vv.addEventListener('scroll', schedule)
    window.addEventListener('scroll', schedule, { passive: true })
    document.addEventListener('focusin', schedule)
    document.addEventListener('focusout', schedule)
    schedule() // 마운트 시점에 이미 offsetTop이 남아 있을 수 있다
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      vv.removeEventListener('resize', schedule)
      vv.removeEventListener('scroll', schedule)
      window.removeEventListener('scroll', schedule)
      document.removeEventListener('focusin', schedule)
      document.removeEventListener('focusout', schedule)
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
  useNavViewportCorrection(navRef)
  return (
    <nav
      ref={navRef}
      aria-label="주요 메뉴"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border flex overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] pb-[env(safe-area-inset-bottom)] bg-sidebar-bg"
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
