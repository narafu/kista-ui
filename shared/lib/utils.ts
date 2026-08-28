import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toNum(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number)
  return Number.isFinite(n) ? n : 0
}

/**
 * 탭형 메뉴(통계·가계부)의 서브 라우트 active 판정 — 루트 경로(rootHref)는 자기 자신과
 * 정확히 일치할 때만(하위 라우트로 오인해 항상 켜지지 않도록), 나머지 탭은 prefix로 판정.
 * `shared/ui/SectionTabBar`와 `widgets/layout/DesktopSidebar`의 서브메뉴가 공유한다.
 */
export function isSectionTabActive(pathname: string, href: string, rootHref: string) {
  return href === rootHref ? pathname === rootHref : pathname.startsWith(href)
}
