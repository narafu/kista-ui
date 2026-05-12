import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const STATUS_COOKIE = 'kista-user-status'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const origin = request.nextUrl.origin
  const code = searchParams.get('code')

  if (!code) {
    const supabaseError = searchParams.get('error') ?? 'none'
    const supabaseDesc = searchParams.get('error_description') ?? 'none'
    const allKeys = [...searchParams.keys()].join(',') || 'empty'
    console.error(`[auth/callback] no code. error=${supabaseError} desc=${supabaseDesc} keys=${allKeys}`)
    return NextResponse.redirect(
      new URL(`/?error=no_code&detail=${encodeURIComponent(supabaseError)}&keys=${encodeURIComponent(allKeys)}`, origin)
    )
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    console.error('[auth/callback] Supabase 세션 교환 실패:', error?.message)
    return NextResponse.redirect(new URL('/?error=auth_failed', origin))
  }

  // kista-api에 사용자 등록/조회
  const token = data.session.access_token
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL

  if (!apiUrl) {
    console.error('[auth/callback] NEXT_PUBLIC_API_BASE_URL 환경변수 미설정')
    return NextResponse.redirect(new URL('/?error=server_error', origin))
  }

  // 카카오 userMetadata에서 정보 추출
  const kakaoId =
    data.user.user_metadata?.provider_id ?? data.user.id
  const nickname =
    data.user.user_metadata?.name ??
    data.user.user_metadata?.full_name ??
    '사용자'

  try {
    const res = await fetch(`${apiUrl}/api/auth/kakao/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ kakaoId, nickname }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[auth/callback] kista-api 등록 실패: HTTP ${res.status}`, body)
      return NextResponse.redirect(
        new URL('/?error=registration_failed', origin)
      )
    }

    const user = await res.json()
    const status: string = user.status

    // status를 쿠키에 저장하여 middleware 빠른 경로 활성화
    const response = NextResponse.redirect(
      new URL(getRedirectPath(status), origin)
    )
    // PENDING은 캐싱 금지 — 승인 후 새로고침 시 쿠키 캐시 히트로 PENDING 유지되는 버그 방지
    if (status !== 'PENDING') {
      response.cookies.set(STATUS_COOKIE, status, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 604800,
        path: '/',
      })
    }

    return response
  } catch (e) {
    console.error('[auth/callback] kista-api 호출 예외:', e)
    return NextResponse.redirect(new URL('/?error=server_error', origin))
  }
}

function getRedirectPath(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return '/dashboard'
    case 'PENDING':
      return '/pending'
    case 'REJECTED':
      return '/rejected'
    default:
      return '/'
  }
}
