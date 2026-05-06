import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/pending', '/rejected']
const ACTIVE_PATHS = ['/dashboard', '/accounts', '/settings']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // auth callback은 통과
  if (pathname.startsWith('/auth/')) {
    return NextResponse.next()
  }

  // TODO(TASK-004): Supabase SSR 세션 확인 및 상태 기반 라우팅 구현
  // Phase 1-2에서는 모든 경로 통과 (더미 데이터 UI 개발용)
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
