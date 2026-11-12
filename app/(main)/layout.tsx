import { DesktopSidebar } from '@widgets/layout/DesktopSidebar'
import { MobileBottomNav } from '@widgets/layout/MobileBottomNav'
import { MobileHeader } from '@widgets/layout/MobileHeader'
import { FcmBridge } from '@widgets/layout/FcmBridge'
import { MetaProvider } from '@entities/meta'
import { PullToRefresh } from '@widgets/pull-to-refresh'
import { TradeNotificationBridge } from '@widgets/layout/TradeNotificationBridge'
import { getMetaBundle } from '@entities/meta'
import { getMe } from '@entities/user'
import { getAuthToken } from '@shared/lib/auth/token'
import { ROLE_COOKIE } from '@shared/lib/auth/cookies'
import { hasValidToken } from '@shared/lib/auth/jwt'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { ShieldCheck, LogOut, LogIn } from 'lucide-react'
import { LogoutButton } from '@features/auth/logout'
import { BASE_CLASS, ICON_LINK_GHOST_CLASS } from '@shared/ui/iconButtonStyles'
import { cn } from '@shared/lib/utils'

interface Props {
  children: React.ReactNode
}

export default async function MainLayout({ children }: Props) {
  const token = await getAuthToken()
  const cookieStore = await cookies()
  // proxy가 /me 응답으로 1시간 캐시하는 role 쿠키 — 로그인 직후 첫 요청만 미존재
  const cachedRole = cookieStore.get(ROLE_COOKIE)?.value
  const [meta, fallbackUser] = await Promise.all([
    getMetaBundle(),
    token && !cachedRole ? getMe(token).catch(() => null) : null,
  ])

  const isAdmin = cachedRole ? cachedRole === 'ADMIN' : fallbackUser?.role === 'ADMIN'
  // '/dashboard'가 비보호 경로가 되면서, AT 만료 + RT 갱신 실패 시 남아있는 죽은 토큰을
  // proxy가 캐시 쿠키만 지우고 kista-token 자체는 지우지 않는 경우가 있어 유효성까지 확인한다
  const isAuthenticated = hasValidToken(token)

  return (
    <MetaProvider meta={meta}>
        {/* 모바일은 앱 셸(h-dvh) 안에서 main만 스크롤한다 — iOS standalone PWA에서 문서 스크롤 시 visualViewport가 어긋나
            position:fixed 하단 네비가 화면 밖으로 밀리던 문제(app_error_logs MOBILE_NAV_VIEWPORT_*)를 네비를 flex 형제로 둬 구조적으로 없앤다 */}
        <div className="flex lg:min-h-screen max-lg:h-dvh max-lg:overflow-hidden bg-background">
        {/* eslint-disable-next-line react-doctor/nextjs-no-use-search-params-without-suspense -- cookies() 사용으로 이미 동적 렌더링이라 CSR bailout 없음, Suspense fallback은 사이드바 깜빡임 유발 */}
        <DesktopSidebar isAdmin={isAdmin} isAuthenticated={isAuthenticated} />
        <div className="flex flex-col flex-1 min-w-0 max-lg:min-h-0">
          <MobileHeader
            // eslint-disable-next-line react-doctor/jsx-no-jsx-as-prop
            trailing={
              isAuthenticated ? (
                <div className="flex items-center gap-1.5">
                  {isAdmin && (
                    <Link
                      href="/admin"
                      aria-label="관리자"
                      className={cn(BASE_CLASS, 'bg-admin-bg text-admin-fg')}
                    >
                      <ShieldCheck className="size-4" />
                    </Link>
                  )}
                  <LogoutButton aria-label="로그아웃" className={ICON_LINK_GHOST_CLASS}>
                    <LogOut className="size-4" />
                  </LogoutButton>
                </div>
              ) : (
                <Link
                  href="/login"
                  aria-label="로그인"
                  className={ICON_LINK_GHOST_CLASS}
                >
                  <LogIn className="size-4" />
                </Link>
              )
            }
          />
          <PullToRefresh />
          {/* scroll-pt-4: 라우트 이동 시 Next가 새 세그먼트에 scrollIntoView할 때 상단 패딩까지 보이게 한다 */}
          <main data-scroll-root className="flex-1 p-4 lg:p-9 max-lg:min-h-0 max-lg:overflow-y-auto max-lg:scroll-pt-4">{children}</main>
          <MobileBottomNav />
        </div>
        {isAuthenticated && <FcmBridge />}
        {/* 비회원은 체결 스트림 대상이 아니다 — 연결하면 auth-error 응답만 받고 끊긴다 */}
        {isAuthenticated && <TradeNotificationBridge />}
        </div>
    </MetaProvider>
  )
}
