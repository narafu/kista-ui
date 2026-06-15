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
