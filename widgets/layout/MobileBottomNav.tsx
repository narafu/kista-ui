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
//   MOBILE_NAV_VIEWPORT_SHIFT phase=start/end: SHIFT_LOG_MIN_MS 넘게 지속된 offsetTop 잔류 구간만(원래 버그 = 오래 남는 잔류).
//     하단 러버밴드·긴 페이지→짧은 페이지 탭 이동은 8~35ms 내 자연 복귀해 2026-09-30 로그 전부가 이 노이즈였다.
//   MOBILE_NAV_VIEWPORT_MISMATCH: 보정 후에도 네비가 visual viewport 하단과 SHIFT_LOG_MIN_MS 넘게 어긋난 경우(보정 가설이 틀렸다는 신호).
//     키보드가 닫히는 도중엔 포커스가 먼저 빠져 isEditableFocused()가 false인데 vvHeight는 아직 작아 순간 오탐이 났다(2026-09-30 2건) — 지속 여부로 거른다.
const SHIFT_LOG_MIN_MS = 300

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
    let episode: { startedAt: number, trigger: string, maxShift: number, timer: number, reported: boolean } | null = null
    let appliedShift = 0
    let mismatchTimer = 0

    const isMismatch = () => {
      const rect = navRef.current?.getBoundingClientRect()
      return !!rect && rect.width > 0 && !isEditableFocused() && Math.abs(rect.bottom - vv.height) > 5
    }

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

      appliedShift = shift

      if (nav.getBoundingClientRect().width === 0) { // lg:hidden 데스크탑 — 진행 중 에피소드는 짝 없는 start가 남지 않게 버린다
        if (episode) clearTimeout(episode.timer)
        episode = null
        return
      }
      if (Math.abs(shift) > 5) {
        if (!episode) {
          const current = { startedAt: Date.now(), trigger: lastEvent, maxShift: shift, timer: 0, reported: false }
          current.timer = window.setTimeout(() => {
            // offsetTop이 이벤트 없이 0으로 돌아왔으면 update를 다시 돌려 transform 해제 + 에피소드 무기록 종료
            if (Math.abs(vv.offsetTop) <= 5) return schedule()
            current.reported = true
            report('MOBILE_NAV_VIEWPORT_SHIFT', { phase: 'start', startTrigger: current.trigger, appliedShift: String(vv.offsetTop) }, false)
          }, SHIFT_LOG_MIN_MS)
          episode = current
        } else if (Math.abs(shift) > Math.abs(episode.maxShift)) {
          episode.maxShift = shift
        }
      } else if (episode) {
        clearTimeout(episode.timer)
        if (episode.reported) report('MOBILE_NAV_VIEWPORT_SHIFT', {
          phase: 'end',
          durationMs: String(Date.now() - episode.startedAt),
          startTrigger: episode.trigger,
          maxShift: String(episode.maxShift),
          endReason: keyboardOpen ? 'keyboardOpen' : 'resolved',
          appliedShift: String(shift),
        }, false)
        episode = null
      }
      if (isMismatch() && !mismatchTimer) {
        mismatchTimer = window.setTimeout(() => {
          mismatchTimer = 0
          if (isMismatch()) report('MOBILE_NAV_VIEWPORT_MISMATCH', { appliedShift: String(appliedShift) })
        }, SHIFT_LOG_MIN_MS)
      }
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
      if (episode) clearTimeout(episode.timer)
      clearTimeout(mismatchTimer)
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
          <Link key={href} href={href} aria-current={active ? 'page' : undefined} className="min-w-0 flex-1 flex flex-col items-center gap-1 py-2.5 relative">
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
