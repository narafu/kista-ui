/**
 * 전략 상세 페이지 경로는 `/accounts/[id]/strategies/[sid]`로
 * "계좌" href(`/accounts`)의 prefix와 겹치므로 별도 처리.
 */
export function isNavItemActive(pathname: string, href: string) {
  if (href === '/strategies') {
    return pathname.startsWith('/strategies') || pathname.includes('/strategies/')
  }
  if (href === '/accounts') {
    return pathname.startsWith('/accounts') && !pathname.includes('/strategies/')
  }
  return pathname.startsWith(href)
}

/**
 * 통계 탭(성과/벤치마크/백테스트) 서브 라우트 active 판정 — '/stats'는 자기 자신과
 * 정확히 일치할 때만(하위 라우트로 오인해 항상 켜지지 않도록), 나머지는 prefix로 판정.
 * DesktopSidebar의 서브메뉴와 app/(main)/stats/StatsHeader의 탭바가 공유한다.
 */
export function isStatsTabActive(pathname: string, href: string) {
  return href === '/stats' ? pathname === '/stats' : pathname.startsWith(href)
}
