import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Base UI Select는 items에 없는 value를 raw 값으로 그리므로, 목록에 없으면 null(placeholder)로 바꾼다. */
export function toSelectValue<T extends string>(items: { value: T }[], value: T | '' | null | undefined): T | null {
  return value && items.some((item) => item.value === value) ? value : null
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

/** 연속된 같은 키끼리 묶는다 — 입력 순서를 유지하고, 떨어져 있는 같은 키는 별도 그룹이 된다. */
export function groupConsecutiveBy<T>(items: T[], keyOf: (item: T) => string): { key: string; items: T[] }[] {
  return items.reduce<{ key: string; items: T[] }[]>((acc, item) => {
    const key = keyOf(item)
    const last = acc[acc.length - 1]
    if (last && last.key === key) last.items.push(item)
    else acc.push({ key, items: [item] })
    return acc
  }, [])
}
