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

const describeElement = (el: Element | null) =>
  el ? [el.tagName.toLowerCase(), el.getAttribute('type'), el.id || el.getAttribute('name')].filter(Boolean).join(':') : 'none'

// iOS standalone PWA: 키보드가 닫힌 뒤(또는 하단 러버밴드 중) visualViewport.offsetTop이 0으로 복귀하지 않고 남아
// position:fixed 네비가 navBottom = innerHeight - offsetTop 위치로 떠 있거나 화면 밖으로 밀린다
// (app_error_logs MOBILE_NAV_VIEWPORT_MISMATCH 2026-09-21~28, 키보드 닫힌 행 전부 이 관계식 성립).
// 키보드 닫힘 + 줌 없음일 때만 offsetTop만큼 되돌린다 — 키보드가 열려 있으면 네비가 키보드 뒤에 있는 게 정상이라 보정 안 함.
// 키보드 판정은 포커스된 편집 요소 기준 — innerHeight 자체가 키보드와 함께 줄어드는 경우가 있어 높이 비교는 못 쓴다.
// ponytail: 실기기 검증 불가라 진단 로그를 같이 유지 — 원인 확정·보정 효과 확인되면 로그 블록 제거.
//   MOBILE_NAV_VIEWPORT_SHIFT phase=start/end: offsetTop 잔류 구간의 시작 트리거·지속시간(보정이 실제로 얼마나 자주 도는지)
//   MOBILE_NAV_VIEWPORT_MISMATCH: 보정 후에도 네비가 visual viewport 하단과 어긋난 경우(보정 가설이 틀렸다는 신호)
function useNavViewportCorrection(navRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const lastLoggedAt: Record<string, number> = {}
    const logCounts: Record<string, number> = {}
    let rafId = 0
    let lastEvent = 'mount'
    let lastFocusOutAt = 0
    let lastBlurred = 'none'
    let episode: { startedAt: number, trigger: string, maxShift: number } | null = null

    // throttle=false는 SHIFT start/end 짝 유지용 — 대신 상한을 늘려 에피소드 5개(start+end)를 담는다
    const report = (errorType: string, extra: Record<string, string>, throttle = true) => {
      const now = Date.now()
      if ((logCounts[errorType] ?? 0) >= (throttle ? 5 : 10)) return
      if (throttle && now - (lastLoggedAt[errorType] ?? 0) < 15000) return
      lastLoggedAt[errorType] = now
      logCounts[errorType] = (logCounts[errorType] ?? 0) + 1
      const rect = navRef.current?.getBoundingClientRect()
      reportClientError({
        errorType,
        context: {
          ...extra,
          navTop: String(rect?.top ?? 'none'),
          navBottom: String(rect?.bottom ?? 'none'),
          innerHeight: String(window.innerHeight),
          screenHeight: String(window.screen.height),
          vvHeight: String(vv.height),
          vvOffsetTop: String(vv.offsetTop),
          vvPageTop: String(vv.pageTop),
          vvScale: String(vv.scale),
          scrollY: String(window.scrollY),
          docScrollHeight: String(document.documentElement.scrollHeight),
          lastEvent,
          activeElement: describeElement(document.activeElement),
          lastBlurred,
          msSinceFocusOut: lastFocusOutAt ? String(now - lastFocusOutAt) : 'never',
          pathname: window.location.pathname,
          standalone: String(window.matchMedia('(display-mode: standalone)').matches),
          userAgent: navigator.userAgent,
        },
      })
    }

    const update = () => {
      rafId = 0
      const nav = navRef.current
      if (!nav) return
      const keyboardOpen = isEditableFocused()
      const shift = !keyboardOpen && Math.abs(vv.scale - 1) < 0.01 ? vv.offsetTop : 0
      nav.style.transform = shift ? `translateY(${shift}px)` : ''

      const rect = nav.getBoundingClientRect()
      if (rect.width === 0) return // lg:hidden 데스크탑
      if (Math.abs(shift) > 5) {
        if (!episode) {
          episode = { startedAt: Date.now(), trigger: lastEvent, maxShift: shift }
          report('MOBILE_NAV_VIEWPORT_SHIFT', { phase: 'start', appliedShift: String(shift) }, false)
        } else if (Math.abs(shift) > Math.abs(episode.maxShift)) {
          episode.maxShift = shift
        }
      } else if (episode) {
        report('MOBILE_NAV_VIEWPORT_SHIFT', {
          phase: 'end',
          durationMs: String(Date.now() - episode.startedAt),
          startTrigger: episode.trigger,
          maxShift: String(episode.maxShift),
          endReason: keyboardOpen ? 'keyboardOpen' : 'resolved',
          appliedShift: String(shift),
        }, false)
        episode = null
      }
      if (keyboardOpen || Math.abs(rect.bottom - vv.height) <= 5) return
      report('MOBILE_NAV_VIEWPORT_MISMATCH', { appliedShift: String(shift) })
    }
    const schedule = (e?: Event) => {
      if (e) {
        lastEvent = `${e.target === vv ? 'vv:' : ''}${e.type}`
        if (e.type === 'focusout') {
          lastFocusOutAt = Date.now()
          lastBlurred = describeElement(e.target instanceof Element ? e.target : null)
        }
      }
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
